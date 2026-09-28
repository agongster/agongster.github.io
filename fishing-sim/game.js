// Tiny Tides — the game: saving, the scene, and the fishing state machine.
// The canvas is only 320x180 pixels; CSS scales it up with nearest-neighbour
// filtering, which is what keeps everything crisp and pixelated.

// ================================================================== save ==
const SAVE_KEY = 'tiny-tides-save-v1';

function freshSave() {
  return {
    started: false, name: '', look: { ...DEFAULT_LOOK }, owned: [],
    coins: 0, bucket: [], dex: {}, rod: 'twig', rods: ['twig'], bucketLvl: 0,
    clock: 0, muted: false, nextUid: 1,
    stats: { caught: 0, earned: 0, sold: 0 },
  };
}

function loadSave() {
  let data = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) { /* private mode or corrupt save: start fresh */ }
  const s = freshSave();
  if (data && typeof data === 'object') {
    Object.assign(s, data);
    s.look = { ...DEFAULT_LOOK, ...(data.look || {}) };
    s.stats = { ...freshSave().stats, ...(data.stats || {}) };
  }
  return sanitizeSave(s);
}

// A save from an older version (or a hand-edited one) can't crash the game.
function sanitizeSave(s) {
  for (const cat of Object.keys(COSMETICS)) {
    if (!COSMETICS[cat].some(i => i.id === s.look[cat])) s.look[cat] = DEFAULT_LOOK[cat];
  }
  const inRange = (v, arr, dflt) => (Number.isInteger(v) && v >= 0 && v < arr.length ? v : dflt);
  s.look.skin = inRange(s.look.skin, SKIN_TONES, DEFAULT_LOOK.skin);
  s.look.hairColor = inRange(s.look.hairColor, HAIR_COLORS, DEFAULT_LOOK.hairColor);
  s.look.topColor = inRange(s.look.topColor, TOP_COLORS, DEFAULT_LOOK.topColor);
  if (!Array.isArray(s.owned)) s.owned = [];
  if (!Array.isArray(s.bucket)) s.bucket = [];
  s.bucket = s.bucket.filter(c => c && FISH_BY_ID[c.id] && Number.isFinite(c.value));
  if (!s.dex || typeof s.dex !== 'object') s.dex = {};
  if (!Array.isArray(s.rods) || !s.rods.includes('twig')) s.rods = ['twig'];
  if (!RODS.some(r => r.id === s.rod) || !s.rods.includes(s.rod)) s.rod = 'twig';
  s.bucketLvl = inRange(s.bucketLvl, BUCKETS, 0);
  s.coins = Math.max(0, Math.floor(Number(s.coins) || 0));
  s.clock = Number(s.clock) || 0;
  s.name = String(s.name || '').slice(0, 14);
  return s;
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeSave, 300);
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage full or blocked */ }
}
function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  Object.assign(save, freshSave());
}

const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));
const save = loadSave();

const currentRod = () => RODS.find(r => r.id === save.rod) || RODS[0];
const bucketCap = () => BUCKETS[save.bucketLvl].cap;
const findCosmetic = (cat, id) => COSMETICS[cat].find(i => i.id === id);
const ownsCosmetic = (cat, id) => {
  const item = findCosmetic(cat, id);
  return !!item && (item.price === 0 || save.owned.includes(cat + ':' + id));
};

// ================================================================ scene ==
const W = 320, H = 180, HORIZON = 96;
const CHAR_X = 92, FEET_Y = 131;
const HAND = { x: CHAR_X + 4, y: FEET_Y - 6 };
const ROD_LEN = 28;

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const fg = makeCanvas(W, H);
const fgx = fg.getContext('2d');
const skyCanvas = makeCanvas(W, HORIZON);
const waterCanvas = makeCanvas(W, H - HORIZON);
let gradientKey = '', gradientAge = 1;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// --- things generated once
const sceneRng = mulberry32(7);
const STARS = Array.from({ length: 50 }, () => ({
  x: Math.floor(sceneRng() * W), y: Math.floor(sceneRng() * (HORIZON - 16)),
  big: sceneRng() < 0.12, p: sceneRng() * 6,
}));
const HILLS_FAR = Array.from({ length: W }, (_, x) => Math.round(6 + 4 * Math.sin(x * 0.025 + 1) + 3 * Math.sin(x * 0.061 + 2)));
const HILLS_NEAR = Array.from({ length: W }, (_, x) => {
  let h = 0;
  if (x > 196) h = Math.max(h, 12 * Math.sin(Math.PI * clamp((x - 196) / 150, 0, 1)) + Math.sin(x * 0.3));
  if (x < 100) h = Math.max(h, 7 * Math.sin(Math.PI * clamp(x / 100, 0, 1)));
  return Math.max(0, Math.round(h));
});
const CLOUDS = [
  { x: 40, y: 22, w: 34, v: 2.2 }, { x: 150, y: 38, w: 26, v: 3 },
  { x: 250, y: 16, w: 42, v: 1.6 }, { x: 330, y: 52, w: 22, v: 3.6 },
];
const WAVES = Array.from({ length: 70 }, () => {
  const depth = sceneRng();
  return { x: sceneRng() * W, y: HORIZON + 2 + Math.floor(depth * depth * (H - HORIZON - 3)), d: depth, dir: sceneRng() < 0.5 ? -1 : 1 };
});
const SHADOWS = Array.from({ length: 5 }, () => ({
  x: rand(140, 310), y: rand(106, 174), vx: rand(4, 10) * (Math.random() < 0.5 ? -1 : 1), size: rand(0.6, 1.4), w: rand(0, 6),
}));
const REEDS = Array.from({ length: 9 }, (_, i) => ({ x: 292 + i * 3 + Math.floor(sceneRng() * 2), h: 12 + Math.floor(sceneRng() * 14), tail: sceneRng() < 0.5, p: sceneRng() * 6 }));
const FIREFLIES = Array.from({ length: 10 }, () => ({ x: rand(10, 140), y: rand(95, 150), a: rand(0.3, 0.8), b: rand(0.3, 0.8), p: rand(0, 6) }));

// ================================================================ state ==
const G = {
  state: 'idle', t: 0, time: 0, down: false,
  power: 0, powerDir: 1, chargeTick: 0,
  rodA: 0.55,
  bob: { x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, dip: 0 },
  wait: 0, nibbles: [], approach: null,
  bite: null, reel: null, landing: null, pending: null,
  ripples: [], particles: [], birds: [], birdTimer: 5,
  blinkT: 2, blinking: 0, buddyBlinkT: 3, buddyBlinking: 0, cheer: 0,
  pal: null, phaseId: 'golden', lastPhaseId: null,
  msgTimer: 0,
};

function phaseInfo() {
  const total = PHASES.length * PHASE_SECONDS;
  const c = ((save.clock % total) + total) % total;
  const i = Math.floor(c / PHASE_SECONDS);
  const local = (c - i * PHASE_SECONDS) / PHASE_SECONDS;
  let b = local > 0.7 ? (local - 0.7) / 0.3 : 0;
  b = b * b * (3 - 2 * b);
  const cur = PHASES[i], next = PHASES[(i + 1) % PHASES.length];
  return { cur, next, blend: b, local, id: b > 0.5 ? next.id : cur.id };
}

function mixPhase(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) {
    const va = a[k], vb = b[k];
    if (Array.isArray(va)) o[k] = va.map((c, i) => lerpColor(c, vb[i], t));
    else if (typeof va === 'string' && va[0] === '#') o[k] = lerpColor(va, vb, t);
    else if (typeof va === 'number') o[k] = lerp(va, vb, t);
    else o[k] = va;
  }
  return o;
}

function setState(s) { G.state = s; G.t = 0; }

function showMessage(text, seconds = 1.6) {
  setPrompt(text);
  G.msgTimer = seconds;
}

function idlePrompt() {
  if (save.bucket.length >= bucketCap()) return 'Bucket full! Sell some fish, or keep fishing and sell straight from the line.';
  return 'Hold to charge your cast, then let go';
}

// ================================================================ input ==
function press() {
  if (G.down) return;
  G.down = true;
  switch (G.state) {
    case 'idle':
      setState('charging');
      G.power = 0; G.powerDir = 1;
      setPrompt('Let go to cast!');
      break;
    case 'waiting':
      setState('retract');
      showMessage('Too soon! Wait for the bobber to dip under.');
      break;
    case 'bite':
      startReel();
      break;
  }
}

function release() {
  if (!G.down) return;
  G.down = false;
  if (G.state === 'charging') cast();
}

function cancelInput() { G.down = false; if (G.state === 'charging') { setState('idle'); setPrompt(idlePrompt()); } }

// ============================================================== fishing ==
function rodTip(a = G.rodA) {
  return { x: HAND.x + Math.sin(a) * ROD_LEN, y: HAND.y - Math.cos(a) * ROD_LEN };
}

function cast() {
  const p = G.power;
  const tip = rodTip(1.0);
  G.bob.sx = tip.x; G.bob.sy = tip.y;
  G.bob.tx = clamp(140 + p * 165 + rand(-4, 4), 136, 310);
  G.bob.ty = clamp(154 - p * 44 + rand(-3, 3), 104, 172);
  G.bob.x = G.bob.sx; G.bob.y = G.bob.sy;
  setState('casting');
  Sound.sfx.cast();
  setPrompt(p > 0.85 ? 'What a cast!' : 'Whoosh...');
}

function landBobber() {
  G.bob.x = G.bob.tx; G.bob.y = G.bob.ty;
  addRipple(G.bob.x, G.bob.y, 1);
  splash(G.bob.x, G.bob.y, 6);
  Sound.sfx.splash();
  const rod = currentRod();
  G.wait = rand(2.2, 5.5) * rod.wait;
  G.nibbles = [];
  const n = Math.floor(rand(0, 3));
  for (let i = 0; i < n; i++) G.nibbles.push(rand(0.6, G.wait - 0.7));
  G.nibbles.sort((a, b) => a - b);
  G.approach = null;
  G.bite = null;
  setState('waiting');
  setPrompt('Waiting for a bite... tap when the bobber dips!');
}

function rollFish() {
  const phaseId = G.phaseId;
  const rod = currentRod();
  const pool = FISH.filter(f => f.phases.includes(phaseId));
  const weightOf = f => {
    let w = RARITY[f.rarity].weight;
    if (f.rarity === 'rare') w *= 1 + rod.luck * 5;
    if (f.rarity === 'legendary') w *= 1 + rod.luck * 8;
    if (f.rarity === 'junk') w *= Math.max(0.2, 1 - rod.luck * 3);
    // spread the weight of a rarity across its members
    return w / pool.filter(o => o.rarity === f.rarity).length;
  };
  const total = pool.reduce((s, f) => s + weightOf(f), 0);
  let r = Math.random() * total;
  for (const f of pool) { r -= weightOf(f); if (r <= 0) return f; }
  return pool[pool.length - 1];
}

function startReel() {
  const rod = currentRod();
  const sp = G.bite;
  G.reel = {
    sp, f: 0.5, tgt: 0.5, timer: 0, fv: 0,
    zw: rod.zone, z: 0.5 - rod.zone / 2, zv: 0,
    progress: 0.3, tick: 0,
  };
  setState('reeling');
  Sound.sfx.bite();
  setPrompt('Hold to push the glow right, let go to drift left. Keep the fish inside!');
}

function updateReel(dt) {
  const r = G.reel, diff = r.sp.diff, rod = currentRod();
  // the fish picks a new spot to dart to every so often
  r.timer -= dt;
  if (r.timer <= 0) {
    const dart = Math.random() < diff * 0.07;
    r.tgt = dart ? (r.f < 0.5 ? rand(0.75, 1) : rand(0, 0.25)) : clamp(r.f + rand(-0.45, 0.45), 0, 1);
    r.timer = rand(0.5, 1.4) / (0.6 + diff * 0.22);
  }
  const speed = 1 + diff * 0.75;
  r.fv = (r.tgt - r.f) * Math.min(1, dt * speed);
  r.f = clamp(r.f + r.fv + Math.sin(G.time * (3 + diff)) * 0.002 * diff, 0, 1);

  // the player's glowing catch zone: holding pushes it right, gravity pulls left
  r.zv += (G.down ? 2.7 : -2.3) * dt;
  r.zv = clamp(r.zv, -1.1, 1.1);
  r.z += r.zv * dt;
  if (r.z < 0) { r.z = 0; r.zv = Math.abs(r.zv) * 0.25; }
  if (r.z > 1 - r.zw) { r.z = 1 - r.zw; r.zv = -Math.abs(r.zv) * 0.25; }

  const inZone = r.f >= r.z && r.f <= r.z + r.zw;
  r.inZone = inZone;
  if (inZone) {
    r.progress += rod.gain * dt;
    r.tick -= dt;
    if (r.tick <= 0) { Sound.sfx.reel(); r.tick = 0.07; }
  } else {
    r.progress -= (0.13 + diff * 0.035) * dt;
  }

  // bobber gets dragged about and slowly pulled toward the dock
  const pull = clamp(r.progress, 0, 1) * 0.45;
  G.bob.x = lerp(G.bob.tx, 150, pull) + (r.f - 0.5) * 18;
  G.bob.y = lerp(G.bob.ty, 150, pull) + Math.sin(G.time * 9) * 0.6;
  if (Math.random() < dt * 6) splash(G.bob.x, G.bob.y, 2);

  if (r.progress >= 1) catchFish();
  else if (r.progress <= 0) escape(r.sp.rarity === 'legendary' || r.sp.rarity === 'rare' ? 'It felt huge... it got away!' : 'It slipped off the hook!');
}

function catchFish() {
  const sp = G.reel.sp, rod = currentRod();
  let norm = Math.pow(Math.random(), 1.4);
  norm = Math.min(1, norm + rod.luck * 0.35 * Math.random());
  const size = Math.round(lerp(sp.size[0], sp.size[1], norm));
  const stars = norm < 0.5 ? 1 : norm < 0.85 ? 2 : 3;
  const value = Math.max(1, Math.round(sp.price * (0.8 + 0.5 * norm) * (stars === 3 ? 1.2 : 1)));
  const prev = save.dex[sp.id];
  const isNew = !prev;
  save.dex[sp.id] = {
    count: (prev ? prev.count : 0) + 1,
    best: Math.max(prev ? prev.best : 0, size),
  };
  save.stats.caught++;
  G.pending = { uid: save.nextUid++, id: sp.id, size, stars, value, isNew };
  persist();
  G.landing = { sx: G.bob.x, sy: G.bob.y };
  G.reel = null;
  setState('landing');
  splash(G.bob.x, G.bob.y, 12);
  Sound.sfx.catch(sp.rarity);
  setPrompt(isNew ? 'A new species!' : 'Got one!');
}

function escape(msg) {
  G.reel = null;
  setState('retract');
  Sound.sfx.escape();
  showMessage(msg, 2);
}

// Called by the catch card: 'keep', 'sell' or 'release'.
function finishCatch(action) {
  const c = G.pending;
  if (!c) return;
  G.pending = null;
  if (action === 'keep' && save.bucket.length < bucketCap()) {
    save.bucket.push(c);
    toast(`${FISH_BY_ID[c.id].name} went in the bucket`);
  } else if (action === 'sell') {
    earn(c.value);
    Sound.sfx.coin();
  } else {
    splash(170, 150, 8);
    addRipple(170, 150, 1);
    toast('Bye bye, little friend!');
  }
  persist();
  refreshHUD();
  setState('idle');
  setPrompt(idlePrompt());
}

// ============================================================== economy ==
function earn(amount) {
  save.coins += amount;
  save.stats.earned += amount;
  toast(`+${amount} coins`, 'coin');
  refreshHUD();
}

function sellFish(uid) {
  const i = save.bucket.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const [c] = save.bucket.splice(i, 1);
  save.stats.sold++;
  earn(c.value);
  Sound.sfx.coin();
  persist();
}

function sellAll() {
  if (!save.bucket.length) return;
  const total = save.bucket.reduce((s, c) => s + c.value, 0);
  save.stats.sold += save.bucket.length;
  save.bucket = [];
  earn(total);
  Sound.sfx.coin();
  persist();
}

function spend(price) {
  if (save.coins < price) { Sound.sfx.error(); return false; }
  save.coins -= price;
  Sound.sfx.buy();
  refreshHUD();
  persist();
  return true;
}

// ================================================================ update ==
function update(dt) {
  G.time += dt;
  G.t += dt;
  if (save.started) save.clock += dt;

  const ph = phaseInfo();
  G.pal = mixPhase(ph.cur, ph.next, ph.blend);
  G.phaseId = ph.id;
  if (G.phaseId !== G.lastPhaseId) {
    const first = G.lastPhaseId === null;
    G.lastPhaseId = G.phaseId;
    Sound.setMood(G.phaseId);
    refreshHUD();
    if (!first && save.started) toast(PHASES.find(p => p.id === G.phaseId).arrive);
  }

  if (G.msgTimer > 0) {
    G.msgTimer -= dt;
    if (G.msgTimer <= 0 && G.state === 'idle') setPrompt(idlePrompt());
  }

  switch (G.state) {
    case 'charging': {
      G.power += G.powerDir * dt * 0.95;
      if (G.power >= 1) { G.power = 1; G.powerDir = -1; }
      if (G.power <= 0) { G.power = 0; G.powerDir = 1; }
      G.chargeTick -= dt;
      if (G.chargeTick <= 0) { Sound.sfx.charge(G.power); G.chargeTick = 0.09; }
      break;
    }
    case 'casting': {
      const k = Math.min(1, G.t / 0.7);
      G.bob.x = lerp(G.bob.sx, G.bob.tx, k);
      G.bob.y = lerp(G.bob.sy, G.bob.ty, k) - Math.sin(Math.PI * k) * (30 + G.power * 30);
      if (k >= 1) landBobber();
      break;
    }
    case 'waiting': {
      G.bob.dip = Math.max(0, G.bob.dip - dt * 6);
      if (G.nibbles.length && G.t >= G.nibbles[0]) {
        G.nibbles.shift();
        G.bob.dip = 1;
        addRipple(G.bob.x, G.bob.y, 0.6);
        Sound.sfx.nibble();
        setPrompt('...a nibble... not yet...');
      }
      if (!G.approach && G.wait - G.t < 1.6) {
        const side = Math.random() < 0.5 ? -1 : 1;
        G.approach = { x: G.bob.x + side * 30, y: G.bob.y + 8 };
      }
      if (G.approach) {
        G.approach.x = lerp(G.approach.x, G.bob.x, dt * 2.2);
        G.approach.y = lerp(G.approach.y, G.bob.y + 2, dt * 2.2);
      }
      if (G.t >= G.wait) {
        G.bite = rollFish();
        G.approach = null;
        setState('bite');
        addRipple(G.bob.x, G.bob.y, 1.2);
        splash(G.bob.x, G.bob.y, 5);
        Sound.sfx.nibble(); Sound.sfx.bite();
        setPrompt('!! TAP NOW !!');
      }
      break;
    }
    case 'bite':
      if (Math.random() < dt * 8) splash(G.bob.x, G.bob.y, 1);
      if (G.t > RARITY[G.bite.rarity].biteWindow) {
        setState('retract');
        Sound.sfx.escape();
        showMessage('Too slow... it swam away!', 2);
      }
      break;
    case 'reeling':
      updateReel(dt);
      break;
    case 'retract': {
      const tip = rodTip();
      const k = Math.min(1, G.t / 0.35);
      G.bob.x = lerp(G.bob.x, tip.x, k);
      G.bob.y = lerp(G.bob.y, tip.y, k);
      if (k >= 1) { setState('idle'); if (G.msgTimer <= 0) setPrompt(idlePrompt()); }
      break;
    }
    case 'landing':
      if (G.t >= 0.85) {
        setState('showing');
        G.cheer = 0.7;
        for (let i = 0; i < 14; i++) sparkle(CHAR_X + rand(-12, 12), FEET_Y - 34 + rand(-10, 6));
        showCatchCard(G.pending);
      }
      break;
  }

  // rod angle eases toward a pose for each state
  const poses = {
    idle: 0.55 + Math.sin(G.time * 1.5) * 0.03, charging: 0.5 - G.power * 1.05,
    casting: 1.05, waiting: 0.8 + G.bob.dip * 0.12, bite: 1.0 + Math.sin(G.time * 30) * 0.05,
    reeling: 0.3 + Math.sin(G.time * 22) * 0.04, retract: 0.3, landing: 0.2, showing: 0.4,
  };
  const target = poses[G.state] ?? 0.55;
  G.rodA += (target - G.rodA) * Math.min(1, dt * (G.state === 'casting' ? 30 : 12));

  // blinking
  G.blinkT -= dt;
  if (G.blinkT <= 0) { G.blinking = 0.13; G.blinkT = rand(2, 5); }
  G.blinking = Math.max(0, G.blinking - dt);
  G.buddyBlinkT -= dt;
  if (G.buddyBlinkT <= 0) { G.buddyBlinking = 0.15; G.buddyBlinkT = rand(2.5, 6); }
  G.buddyBlinking = Math.max(0, G.buddyBlinking - dt);
  G.cheer = Math.max(0, G.cheer - dt);

  // ambient life
  for (const s of SHADOWS) {
    s.x += s.vx * dt;
    s.w += dt;
    if (s.x < 138 || s.x > 314) { s.vx = -s.vx; s.x = clamp(s.x, 138, 314); }
    if (Math.random() < dt * 0.1) s.vx = -s.vx;
  }
  for (const c of CLOUDS) {
    c.x += c.v * dt;
    if (c.x - c.w > W + 10) c.x = -c.w - 10;
  }
  G.birdTimer -= dt;
  if (G.birdTimer <= 0 && G.pal.night < 0.5) {
    const y = rand(18, 60);
    const n = Math.random() < 0.4 ? 3 : 1;
    for (let i = 0; i < n; i++) G.birds.push({ x: -6 - i * 7, y: y + i * 3, v: rand(14, 20), p: rand(0, 6) });
    G.birdTimer = rand(10, 22);
  }
  G.birds = G.birds.filter(b => (b.x += b.v * dt) < W + 10);
  G.ripples = G.ripples.filter(r => (r.life -= dt * 0.9) > 0);
  G.particles = G.particles.filter(p => {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    return p.life > 0;
  });
}

// ============================================================ particles ==
function addRipple(x, y, strength) { G.ripples.push({ x, y, life: 1, s: strength }); }
function splash(x, y, n) {
  for (let i = 0; i < n; i++) {
    G.particles.push({ x, y: y - 1, vx: rand(-22, 22), vy: rand(-45, -15), g: 140, life: rand(0.3, 0.6), col: '#fff4e0', size: 1 });
  }
}
function sparkle(x, y) {
  G.particles.push({ x, y, vx: rand(-15, 15), vy: rand(-30, -8), g: 20, life: rand(0.6, 1.1), col: Math.random() < 0.5 ? '#ffd27a' : '#fff4e0', size: 1, star: true });
}

// ================================================================ drawing ==
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Ordered (Bayer) dithering between palette bands gives the retro sky look.
function paintGradient(c, colors) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const img = g.createImageData(w, h), d = img.data;
  const rgb = colors.map(hexToRgb), n = rgb.length - 1;
  for (let y = 0; y < h; y++) {
    const pos = (y / (h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(pos));
    const f = Math.round((pos - i) * 4) / 4;
    for (let x = 0; x < w; x++) {
      const c2 = f > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? rgb[i + 1] : rgb[i];
      const k = (y * w + x) * 4;
      d[k] = c2[0]; d[k + 1] = c2[1]; d[k + 2] = c2[2]; d[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); }

function disc(g, cx, cy, r, col, maxY = Infinity, skipRow = null) {
  g.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const y = Math.round(cy + dy);
    if (y >= maxY) break;
    if (skipRow && skipRow(dy)) continue;
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(Math.round(cx - half), y, half * 2 + 1, 1);
  }
}

function ellipse(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  ry = Math.max(1, ry);
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    g.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

function ring(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  const steps = Math.max(12, Math.ceil(rx * 5));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}

// Plots a quadratic curve one pixel at a time so lines stay pixel-crisp.
function curve(g, x0, y0, cx, cy, x1, y1, col, thickUntil = 0) {
  g.fillStyle = col;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    g.fillRect(Math.round(x), Math.round(y), t < thickUntil ? 2 : 1, 1);
  }
}

function draw() {
  const pal = G.pal;
  const g = ctx;

  // --- sky and water gradients (recomputed a few times a second)
  gradientAge += 1;
  const key = pal.sky.join() + pal.water.join();
  if (key !== gradientKey && gradientAge > 8) {
    paintGradient(skyCanvas, pal.sky);
    paintGradient(waterCanvas, pal.water);
    gradientKey = key; gradientAge = 0;
  }
  g.drawImage(skyCanvas, 0, 0);

  // --- stars and moon
  if (pal.stars > 0.02) {
    for (const s of STARS) {
      const a = pal.stars * (0.55 + 0.45 * Math.sin(G.time * 1.7 + s.p));
      g.fillStyle = `rgba(255,244,224,${a.toFixed(2)})`;
      g.fillRect(s.x, s.y, 1, 1);
      if (s.big && a > 0.5) {
        g.fillStyle = `rgba(255,244,224,${(a * 0.45).toFixed(2)})`;
        g.fillRect(s.x - 1, s.y, 1, 1); g.fillRect(s.x + 1, s.y, 1, 1);
        g.fillRect(s.x, s.y - 1, 1, 1); g.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
  }
  if (pal.moon > 0.02) {
    g.globalAlpha = pal.moon;
    disc(g, 62, 26, 11, rgba('#efe6ff', 0.12));
    disc(g, 62, 26, 7, '#fff3dc');
    rect(g, 59, 23, 2, 2, '#e8dcc4'); rect(g, 64, 28, 3, 2, '#e8dcc4'); rect(g, 63, 22, 1, 1, '#e8dcc4');
    g.globalAlpha = 1;
  }

  // --- the sun, with retro stripes cut into its lower half
  const sunX = 228, sunY = Math.round(pal.sunY), sunR = 15;
  if (sunY - sunR < HORIZON) {
    disc(g, sunX, sunY, sunR + 7, rgba(pal.sun, 0.14), HORIZON);
    disc(g, sunX, sunY, sunR + 3, rgba(pal.sun, 0.22), HORIZON);
    disc(g, sunX, sunY, sunR, pal.sun, HORIZON, dy => dy > 3 && (dy % 4 === 0 || (dy > 9 && dy % 4 === 1)));
  }

  // --- clouds (lit from below)
  for (const c of CLOUDS) {
    const x = Math.round(c.x), y = c.y, hw = Math.round(c.w / 2);
    ellipse(g, x, y + 1, hw, 2, pal.cloudShade);
    ellipse(g, x - Math.round(c.w / 6), y - 2, Math.round(c.w / 4), 3, pal.cloudShade);
    ellipse(g, x, y, hw, 2, pal.cloud);
    ellipse(g, x - Math.round(c.w / 6), y - 3, Math.round(c.w / 4), 3, pal.cloud);
    ellipse(g, x + Math.round(c.w / 7), y - 2, Math.round(c.w / 5), 2, pal.cloud);
  }

  // --- birds
  g.fillStyle = rgba('#3a2440', 0.8);
  for (const b of G.birds) {
    const up = Math.sin(G.time * 10 + b.p) > 0;
    const x = Math.round(b.x), y = Math.round(b.y + Math.sin(G.time * 2 + b.p) * 2);
    g.fillRect(x, y, 1, 1);
    g.fillRect(x - 1, up ? y - 1 : y, 1, 1); g.fillRect(x + 1, up ? y - 1 : y, 1, 1);
    g.fillRect(x - 2, up ? y - 2 : y, 1, 1); g.fillRect(x + 2, up ? y - 2 : y, 1, 1);
  }

  // --- hills and the little lighthouse
  g.fillStyle = pal.hillsFar;
  for (let x = 0; x < W; x++) g.fillRect(x, HORIZON - HILLS_FAR[x], 1, HILLS_FAR[x]);
  g.fillStyle = pal.hills;
  for (let x = 0; x < W; x++) if (HILLS_NEAR[x]) g.fillRect(x, HORIZON - HILLS_NEAR[x], 1, HILLS_NEAR[x]);
  drawLighthouse(g, pal);

  // --- water
  g.drawImage(waterCanvas, 0, HORIZON);
  rect(g, 0, HORIZON, W, 1, rgba(pal.refl, 0.35));
  drawReflection(g, pal);
  for (const w of WAVES) {
    const x = ((w.x + G.time * (2 + w.d * 7) * w.dir) % (W + 20) + W + 20) % (W + 20) - 10;
    const len = 2 + Math.round(w.d * 6);
    g.fillStyle = `rgba(255,240,230,${(0.1 + w.d * 0.16).toFixed(2)})`;
    g.fillRect(Math.round(x), w.y, len, 1);
  }

  // --- fish shadows under the water
  for (const s of SHADOWS) drawShadow(g, s.x, s.y + Math.sin(s.w) * 2, s.size, Math.sign(s.vx));
  if (G.approach) drawShadow(g, G.approach.x, G.approach.y, 1.3, G.bob.x > G.approach.x ? 1 : -1);

  // --- lily pads
  const padCol = lerpColor('#6aa860', '#22304a', pal.night * 0.8);
  for (const [x, y, r] of [[182, 168, 6], [232, 176, 7], [206, 160, 4]]) {
    ellipse(g, x, y, r, Math.max(1, Math.round(r / 3)), padCol);
    rect(g, x + 1, y - 1, 2, 1, shade(padCol, -0.25));
  }
  rect(g, 180, 165, 2, 2, '#ff9ec4'); rect(g, 181, 164, 1, 1, '#fff3c4');

  // --- ripples
  for (const r of G.ripples) {
    const k = 1 - r.life;
    ring(g, r.x, r.y, 2 + k * 10 * r.s, 1 + k * 3 * r.s, `rgba(255,244,224,${(r.life * 0.6).toFixed(2)})`);
  }

  // --- the bobber (before the foreground so the dock never hides it wrongly)
  if (['casting', 'waiting', 'bite', 'reeling', 'retract'].includes(G.state)) drawBobber(g);

  // --- foreground: dock, angler, buddy (tinted as night falls)
  fgx.clearRect(0, 0, W, H);
  drawDock(fgx, pal);
  drawBucketProp(fgx);
  drawBuddy(fgx);
  drawAnglerInScene(fgx);
  drawRod(fgx);
  if (pal.night > 0.01) {
    fgx.globalCompositeOperation = 'source-atop';
    fgx.fillStyle = rgba('#2a2060', pal.night * 0.42);
    fgx.fillRect(0, 0, W, H);
    fgx.globalCompositeOperation = 'source-over';
  }
  g.drawImage(fg, 0, 0);
  drawLampGlow(g, pal);

  // --- fishing line
  if (!['idle', 'charging', 'showing'].includes(G.state)) {
    const tip = rodTip();
    const end = G.state === 'landing' ? landingPos() : G.bob;
    const taut = G.state === 'reeling' || G.state === 'bite' || G.state === 'landing';
    const sag = taut ? 0 : 12;
    curve(g, tip.x, tip.y, (tip.x + end.x) / 2, Math.max(tip.y, end.y) + sag, end.x, end.y - 3, 'rgba(255,244,224,0.75)');
  }

  // --- reeds and fireflies in the very front
  const reedCol = lerpColor('#4f7a48', '#1a2438', pal.night * 0.85);
  for (const r of REEDS) {
    const sway = Math.round(Math.sin(G.time * 1.3 + r.p) * 1.2);
    curve(g, r.x, H, r.x, H - r.h / 2, r.x + sway, H - r.h, reedCol);
    if (r.tail) rect(g, r.x + sway - 0.5, H - r.h - 3, 2, 4, lerpColor('#8a5030', '#2a2030', pal.night * 0.7));
  }
  if (pal.night > 0.3) {
    for (const f of FIREFLIES) {
      const a = (pal.night - 0.3) * (0.5 + 0.5 * Math.sin(G.time * 3 + f.p));
      const x = f.x + Math.sin(G.time * f.a + f.p) * 12, y = f.y + Math.cos(G.time * f.b + f.p) * 6;
      g.fillStyle = `rgba(255,230,120,${(a * 0.25).toFixed(2)})`;
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      g.fillStyle = `rgba(255,240,160,${a.toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  // --- particles
  for (const p of G.particles) {
    g.fillStyle = p.col;
    const x = Math.round(p.x), y = Math.round(p.y);
    g.fillRect(x, y, 1, 1);
    if (p.star && p.life > 0.3) {
      g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1);
    }
  }

  // --- in-scene UI
  if (G.state === 'charging') drawPowerMeter(g);
  if (G.state === 'bite') drawExclaim(g, G.bob.x, G.bob.y - 16 - Math.abs(Math.sin(G.t * 14)) * 3);
  if (G.state === 'reeling') drawReel(g);
  if (G.state === 'landing') drawLandingFish(g);
}

function drawLighthouse(g, pal) {
  const x = 292, base = HORIZON - HILLS_NEAR[x + 1];
  const body = lerpColor('#fff4e0', '#5a5080', pal.night * 0.7);
  const stripe = lerpColor('#e0566e', '#4a2a5a', pal.night * 0.7);
  for (let i = 0; i < 12; i++) rect(g, x - (i < 6 ? 2 : 1), base - i, i < 6 ? 5 : 4, 1, Math.floor(i / 3) % 2 ? stripe : body);
  rect(g, x - 2, base - 15, 5, 3, lerpColor('#3a2a50', '#141030', pal.night));
  rect(g, x - 1, base - 16, 3, 1, stripe);
  const on = pal.lamp > 0.3 && Math.sin(G.time * 2.4) > -0.3;
  rect(g, x - 1, base - 14, 3, 1, on ? '#ffe89a' : '#6a5a70');
  if (on) {
    const beamLeft = Math.sin(G.time * 0.8) > 0;
    g.fillStyle = `rgba(255,232,154,${(0.1 * pal.lamp).toFixed(2)})`;
    for (let i = 1; i < 40; i++) {
      const hgt = Math.ceil(i / 10);
      g.fillRect(beamLeft ? x - 1 - i : x + 1 + i, base - 14 - Math.floor(hgt / 2), 1, hgt);
    }
  }
}

function drawReflection(g, pal) {
  // sun reflection fades as the sun sinks; the moon takes over at night
  const sunVis = clamp((HORIZON + 10 - pal.sunY) / 24, 0, 1);
  const layers = [{ x: 228, a: sunVis, col: pal.refl }, { x: 62, a: pal.moon * 0.8, col: '#efe6ff' }];
  for (const L of layers) {
    if (L.a < 0.03) continue;
    for (let y = HORIZON + 1; y < H; y += 2) {
      if ((y + Math.floor(G.time * 5)) % 5 >= 3) continue;
      const depth = (y - HORIZON) / (H - HORIZON);
      const w = 3 + depth * 34;
      const off = Math.sin(G.time * 2 + y * 0.7) * (1 + depth * 3);
      g.fillStyle = rgba(L.col, (L.a * (0.75 - depth * 0.45)).toFixed(2));
      g.fillRect(Math.round(L.x - w / 2 + off), y, Math.round(w * (0.6 + 0.4 * Math.sin(y * 1.3 + G.time))), 1);
    }
  }
}

function drawShadow(g, x, y, size, dir) {
  const depth = (y - HORIZON) / (H - HORIZON);
  const sc = 0.55 + depth * 0.75;
  const rx = Math.max(2, Math.round((3 + size * 2.5) * sc)), ry = Math.max(1, Math.round(rx * 0.35));
  const col = 'rgba(24,12,44,0.26)';
  ellipse(g, x, y, rx, ry, col);
  const tx = Math.round(x - dir * (rx + 1));
  g.fillRect(tx - (dir > 0 ? 1 : 0), Math.round(y) - 1, 2, 3);
}

function drawBobber(g) {
  const b = G.bob;
  const x = Math.round(b.x);
  let y = Math.round(b.y);
  const floating = G.state === 'waiting' || G.state === 'reeling';
  const bobOff = floating ? Math.round(Math.sin(G.time * 3) * 0.6 + b.dip * 2) : 0;
  const sunk = G.state === 'bite' ? 3 : G.state === 'reeling' ? 1 : 0;
  const inAir = G.state === 'casting' || G.state === 'retract';
  const top = y - 5 + bobOff + sunk;
  g.save();
  if (!inAir) { g.beginPath(); g.rect(0, 0, W, y); g.clip(); }
  rect(g, x, top - 1, 1, 1, OUTLINE);
  rect(g, x - 2, top, 5, 5, OUTLINE);
  rect(g, x - 1, top + 1, 3, 2, '#e0566e');
  rect(g, x - 1, top + 1, 1, 1, '#ff9ab0');
  rect(g, x - 1, top + 3, 3, 1, '#fff4e0');
  g.restore();
  if (!inAir) rect(g, x - 3, y, 7, 1, 'rgba(255,244,224,0.45)');
}

function drawDock(g, pal) {
  const top = '#c07850', seam = '#8a4f3a', hi = '#e09a68', face = '#7a4432', post = '#5a3028';
  // posts in the water
  for (const px of [12, 52, 92, 116]) {
    rect(g, px, 140, 5, 20, post);
    rect(g, px, 140, 1, 20, shade(post, 0.15));
    rect(g, px - 1, 158 + Math.round(Math.sin(G.time * 2 + px) * 0.6), 7, 1, rgba(pal.refl, 0.35));
  }
  // deck surface: a slanted slab gives the 2.5D look
  for (let y = 124; y <= 136; y++) {
    const end = 116 + Math.round((y - 124) * 0.5);
    rect(g, 0, y, end, 1, (y - 124) % 4 === 3 ? seam : top);
  }
  for (let y = 124; y <= 136; y += 4) rect(g, 0, y, 116 + Math.round((y - 124) * 0.5), 1, hi);
  for (const sx of [18, 46, 74, 102]) rect(g, sx + ((sx / 2) % 4), 125, 1, 2, seam);
  // front face
  rect(g, 0, 137, 123, 4, face);
  rect(g, 0, 137, 123, 1, shade(face, 0.2));
  // bollard with rope at the end
  rect(g, 108, 118, 4, 8, post);
  rect(g, 107, 117, 6, 2, shade(post, 0.2));
  rect(g, 107, 121, 6, 1, '#e8d0a0');
  // lantern post
  rect(g, 20, 100, 2, 26, post);
  rect(g, 17, 92, 8, 1, OUTLINE);
  rect(g, 18, 93, 6, 7, OUTLINE);
  rect(g, 19, 94, 4, 5, pal.lamp > 0.3 ? '#ffe08a' : '#6a4a60');
  rect(g, 20, 91, 2, 1, OUTLINE);
}

function drawLampGlow(g, pal) {
  if (pal.lamp < 0.05) return;
  const flick = 0.9 + Math.sin(G.time * 7) * 0.05 + Math.sin(G.time * 13) * 0.04;
  disc(g, 21, 96, 18, rgba('#ffd27a', 0.06 * pal.lamp * flick));
  disc(g, 21, 96, 11, rgba('#ffd27a', 0.09 * pal.lamp * flick));
  disc(g, 21, 96, 6, rgba('#fff0b0', 0.12 * pal.lamp * flick));
}

function drawBucketProp(g) {
  const x = 40, y = 122;
  const lvl = save.bucketLvl;
  const n = save.bucket.length;
  const tails = Math.min(3, Math.ceil((n / bucketCap()) * 3));
  for (let i = 0; i < tails; i++) {
    const sp = FISH_BY_ID[save.bucket[save.bucket.length - 1 - i].id];
    const col = sp.fin || '#8a5a3a';
    rect(g, x + 2 + i * 3, y - 3, 1, 3, col);
    rect(g, x + 1 + i * 3, y - 4, 3, 1, col);
  }
  if (lvl === 2) {
    rect(g, x - 2, y - 1, 13, 10, OUTLINE);
    rect(g, x - 1, y, 11, 8, '#7fb8e6');
    rect(g, x - 1, y, 11, 2, '#fff4e0');
    rect(g, x + 3, y + 4, 3, 1, '#4a78a8');
  } else {
    const body = lvl === 1 ? '#ff8a6b' : '#a8a0b8';
    rect(g, x - 1, y - 1, 11, 10, OUTLINE);
    rect(g, x, y, 9, 8, body);
    rect(g, x, y, 9, 1, shade(body, 0.35));
    rect(g, x + 1, y + 2, 1, 5, shade(body, 0.2));
    rect(g, x + 1, y - 5, 7, 1, OUTLINE); rect(g, x, y - 4, 1, 3, OUTLINE); rect(g, x + 8, y - 4, 1, 3, OUTLINE);
  }
}

function drawBuddy(g) {
  if (save.look.buddy === 'none') return;
  const spr = buddySprite(save.look.buddy, G.buddyBlinking > 0);
  if (!spr) return;
  const hop = Math.floor(G.time * 1.6) % 2;
  const x = 66 - Math.round(spr.width / 2), y = FEET_Y + 2 - spr.height + hop;
  ellipse(g, 66, FEET_Y + 2, Math.round(spr.width / 2), 1, 'rgba(42,26,46,0.25)');
  g.drawImage(spr, x, y);
}

function anglerFrame() {
  const speed = G.state === 'reeling' ? 6 : 2;
  return { bob: Math.floor(G.time * speed) % 2 === 1, blink: G.blinking > 0 };
}

function drawAnglerInScene(g) {
  const spr = anglerSprite(save.look, anglerFrame());
  const jump = G.cheer > 0 ? Math.round(Math.sin((G.cheer / 0.7) * Math.PI) * 5) : 0;
  ellipse(g, CHAR_X, FEET_Y + 1, 7, 1, 'rgba(42,26,46,0.28)');
  g.drawImage(spr, CHAR_X - ANGLER_W / 2, FEET_Y - ANGLER_FEET - jump);
}

function drawRod(g) {
  const rod = currentRod();
  const tip = rodTip();
  let bendX = 0, bendY = 0;
  if (G.state === 'reeling' || G.state === 'bite') { bendX = 4; bendY = 5; }
  const mx = (HAND.x + tip.x) / 2 + bendX, my = (HAND.y + tip.y) / 2 + bendY;
  curve(g, HAND.x, HAND.y + 3, mx, my, tip.x, tip.y, rod.color, 0.25);
  rect(g, HAND.x, HAND.y + 2, 2, 3, OUTLINE);
  rect(g, HAND.x - 1, HAND.y - 1, 2, 2, '#b8b0c0');
  if (rod.id === 'star' && Math.sin(G.time * 4) > 0.3) rect(g, tip.x - 1, tip.y - 1, 1, 1, '#fff3c4');
}

function drawPowerMeter(g) {
  const x = CHAR_X + 16, y = FEET_Y - 44, h = 30;
  rect(g, x - 1, y - 1, 6, h + 2, OUTLINE);
  rect(g, x, y, 4, h, '#3a2a4a');
  const fill = Math.round(G.power * h);
  for (let i = 0; i < fill; i++) {
    const t = i / h;
    rect(g, x, y + h - 1 - i, 4, 1, t < 0.5 ? lerpColor('#8fd19e', '#ffd27a', t * 2) : lerpColor('#ffd27a', '#ff6a5a', (t - 0.5) * 2));
  }
  rect(g, x, y + h - 1 - fill, 4, 1, '#fff4e0');
}

function drawExclaim(g, x, y) {
  x = Math.round(x); y = Math.round(y);
  rect(g, x - 2, y - 1, 5, 11, OUTLINE);
  rect(g, x - 1, y, 3, 6, '#fff4e0');
  rect(g, x - 1, y + 7, 3, 2, '#fff4e0');
  rect(g, x - 1, y, 1, 6, '#ffd27a');
}

const miniFishCache = new Map();
function miniFish(sp) {
  if (!miniFishCache.has(sp.id)) {
    const body = sp.body || '#8a5a3a', fin = sp.fin || '#6a4a3a';
    miniFishCache.set(sp.id, addOutline(mapCanvas(['t.bbb.', 'tbbbeb', 't.bbb.'], { t: fin, b: body, e: OUTLINE })));
  }
  return miniFishCache.get(sp.id);
}

function drawReel(g) {
  const r = G.reel;
  const x0 = 70, x1 = 250, bw = x1 - x0, y = 12;
  rect(g, x0 - 7, y - 6, bw + 14, 27, 'rgba(42,26,46,0.82)');
  rect(g, x0 - 7, y - 6, bw + 14, 1, '#ffd27a');
  rect(g, x0 - 7, y + 20, bw + 14, 1, '#ffd27a');
  rect(g, x0 - 7, y - 6, 1, 27, '#ffd27a');
  rect(g, x0 + bw + 6, y - 6, 1, 27, '#ffd27a');
  rect(g, x0, y, bw, 10, '#1c1436');
  for (let i = 0; i < bw; i += 6) rect(g, x0 + i + ((Math.floor(G.time * 8)) % 6), y + 4, 2, 1, 'rgba(127,184,230,0.25)');
  const zx = x0 + r.z * bw, zw = r.zw * bw;
  rect(g, zx, y, zw, 10, r.inZone ? 'rgba(255,210,122,0.7)' : 'rgba(255,210,122,0.4)');
  rect(g, zx, y, 1, 10, '#ffd27a'); rect(g, zx + zw - 1, y, 1, 10, '#ffd27a');
  const spr = miniFish(r.sp);
  const fx = Math.round(x0 + r.f * bw), fy = y + 5;
  g.save();
  g.translate(fx, fy - Math.floor(spr.height / 2));
  if (r.fv < 0) g.scale(-1, 1);
  g.drawImage(spr, -Math.floor(spr.width / 2), Math.round(Math.sin(G.time * 12) * 0.6));
  g.restore();
  const p = clamp(r.progress, 0, 1);
  rect(g, x0, y + 13, bw, 4, '#3a2a4a');
  const col = p < 0.5 ? lerpColor('#e0566e', '#ffd27a', p * 2) : lerpColor('#ffd27a', '#8fd19e', (p - 0.5) * 2);
  rect(g, x0, y + 13, Math.round(bw * p), 4, col);
  rect(g, x0, y + 13, Math.round(bw * p), 1, shade(col, 0.4));
}

function landingPos() {
  const k = Math.min(1, G.t / 0.85);
  return {
    x: lerp(G.landing.sx, CHAR_X + 2, k),
    y: lerp(G.landing.sy, FEET_Y - 34, k) - Math.sin(Math.PI * k) * 40,
  };
}

function drawLandingFish(g) {
  const sp = FISH_BY_ID[G.pending.id];
  const spr = fishSprite(sp);
  const p = landingPos();
  g.drawImage(spr, Math.round(p.x - spr.width / 2), Math.round(p.y - spr.height / 2));
  if (Math.random() < 0.5) sparkle(p.x + rand(-6, 6), p.y + rand(-4, 4));
}

// ================================================================== loop ==
let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  uiTick();
  requestAnimationFrame(frame);
}
