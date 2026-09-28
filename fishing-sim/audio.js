// Tiny Tides — sound.
// Every sound is synthesised with the Web Audio API, so there are no audio
// files to load. Browsers only allow audio after a click or tap, so init()
// is called from the first button press.

const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null;
  let muted = false;
  let musicTimer = null, nextNoteTime = 0, step = 0;
  let mood = 'golden';

  function init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ac.destination);

    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);

    const warm = ac.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 1800;
    musicBus = ac.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(warm);
    warm.connect(master);

    startMusic();
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ac.currentTime, 0.05);
  }

  // One synthesised note with a quick attack and a soft decay.
  function tone(freq, dur, opts = {}) {
    if (!ac || muted) return;
    const { type = 'square', vol = 0.08, slide = 0, delay = 0, bus = sfxBus } = opts;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(dur, opts = {}) {
    if (!ac || muted) return;
    const { vol = 0.2, freq = 1200, q = 1, sweep = 0, delay = 0, type = 'bandpass' } = opts;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
    src.buffer = noiseBuf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(gn); gn.connect(sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const sfx = {
    click() { tone(880, 0.05, { vol: 0.04 }); },
    open() { tone(660, 0.06, { vol: 0.04 }); tone(990, 0.08, { vol: 0.04, delay: 0.05 }); },
    charge(p) { tone(300 + p * 500, 0.04, { type: 'triangle', vol: 0.03 }); },
    cast() { noise(0.35, { vol: 0.25, freq: 2400, sweep: -1800, q: 2 }); },
    splash() {
      noise(0.3, { vol: 0.3, freq: 900, sweep: -600, q: 0.8 });
      tone(520, 0.12, { type: 'sine', vol: 0.06, slide: -300 });
    },
    nibble() { tone(700, 0.05, { type: 'sine', vol: 0.06 }); },
    bite() {
      tone(1046, 0.08, { vol: 0.07 });
      tone(1318, 0.12, { vol: 0.07, delay: 0.08 });
      noise(0.2, { vol: 0.2, freq: 1400, q: 1 });
    },
    reel() { tone(1600 + Math.random() * 300, 0.02, { type: 'square', vol: 0.015 }); },
    escape() {
      tone(523, 0.14, { type: 'triangle', vol: 0.08 });
      tone(415, 0.14, { type: 'triangle', vol: 0.08, delay: 0.13 });
      tone(330, 0.3, { type: 'triangle', vol: 0.08, delay: 0.26 });
    },
    catch(rarity) {
      const notes = rarity === 'legendary' ? [523, 659, 784, 1046, 1318, 1568]
        : rarity === 'rare' ? [523, 659, 784, 1046, 1318] : [523, 659, 784, 1046];
      notes.forEach((n, i) => tone(n, 0.16, { vol: 0.07, delay: i * 0.08 }));
      noise(0.25, { vol: 0.25, freq: 1100, q: 0.8 });
    },
    coin() {
      tone(988, 0.06, { vol: 0.06 });
      tone(1318, 0.18, { vol: 0.06, delay: 0.06 });
    },
    buy() {
      [784, 988, 1175, 1568].forEach((n, i) => tone(n, 0.12, { type: 'triangle', vol: 0.08, delay: i * 0.06 }));
    },
    error() { tone(220, 0.15, { type: 'square', vol: 0.05, slide: -60 }); },
  };

  // ---- music: a slow, soft, never-quite-repeating lullaby
  const CHORDS = {
    // pentatonic-ish chord tones, in Hz. Each phase has its own progression.
    golden: [[261.6, 329.6, 392, 523.3], [220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [196, 246.9, 293.7, 392]],
    sunset: [[174.6, 220, 261.6, 349.2], [196, 246.9, 293.7, 392], [220, 261.6, 329.6, 440], [164.8, 196, 246.9, 329.6]],
    dusk: [[220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [146.8, 174.6, 220, 293.7], [164.8, 207.7, 246.9, 329.6]],
    night: [[220, 261.6, 329.6, 440], [146.8, 174.6, 220, 293.7], [174.6, 220, 261.6, 349.2], [164.8, 196, 246.9, 329.6]],
  };
  const STEP = 0.42;

  function playStep(time) {
    const prog = CHORDS[mood] || CHORDS.golden;
    const chord = prog[Math.floor(step / 8) % prog.length];
    const quiet = mood === 'night' ? 0.6 : 1;
    const note = (f, dur, vol, type = 'triangle') => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol * quiet, time + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g); g.connect(musicBus);
      o.start(time); o.stop(time + dur + 0.05);
    };
    if (step % 8 === 0) note(chord[0] / 2, STEP * 7, 0.05, 'sine');
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    if (Math.random() < (mood === 'night' ? 0.45 : 0.7)) {
      const f = chord[pattern[step % 8]] * (Math.random() < 0.25 ? 2 : 1);
      note(f, STEP * 2.2, 0.035);
    }
    step++;
  }

  function startMusic() {
    nextNoteTime = ac.currentTime + 0.2;
    musicTimer = setInterval(() => {
      if (!ac || muted) { if (ac) nextNoteTime = ac.currentTime + 0.1; return; }
      // After a hidden tab the timer lags; skip ahead rather than burst.
      if (nextNoteTime < ac.currentTime - 0.2) nextNoteTime = ac.currentTime + 0.05;
      while (nextNoteTime < ac.currentTime + 0.25) {
        playStep(nextNoteTime);
        nextNoteTime += STEP;
      }
    }, 90);
  }

  function setMood(m) { mood = m; }

  return { init, setMuted, isMuted: () => muted, sfx, setMood };
})();
