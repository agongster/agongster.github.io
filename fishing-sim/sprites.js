// Tiny Tides — pixel art.
// Nothing here loads an image file: every sprite is painted pixel by pixel
// onto a small offscreen canvas, then given a 1px dark outline automatically.

// ------------------------------------------------------------ colour utils --
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}
function lerpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
// amt < 0 darkens toward a warm plum, amt > 0 lightens toward cream
function shade(hex, amt) {
  return amt < 0 ? lerpColor(hex, '#2a1a3e', -amt) : lerpColor(hex, '#fffaf0', amt);
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Paints OUTLINE onto every empty pixel that touches a filled one.
function addOutline(c, color = OUTLINE) {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const [r, gg, b] = hexToRgb(color);
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 0) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        out[i] = r; out[i + 1] = gg; out[i + 2] = b; out[i + 3] = 255;
      }
    }
  }
  img.data.set(out);
  g.putImageData(img, 0, 0);
  return c;
}

function silhouette(src, color = '#1e1636') {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Renders a list of strings where each character is a palette key ('.' = empty).
function mapCanvas(rows, palette, margin = 1) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = makeCanvas(w + margin * 2, h + margin * 2);
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = palette[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + margin, y + margin, 1, 1);
    }
  });
  return c;
}

const dataUrlCache = new Map();
function spriteDataUrl(key, makeSprite) {
  if (!dataUrlCache.has(key)) dataUrlCache.set(key, makeSprite().toDataURL());
  return dataUrlCache.get(key);
}

// ---------------------------------------------------------------- angler --
// The angler is 16x25 "art pixels" inside a 20x30 canvas (2px margin so hats,
// pigtails and the outline have room). Feet sit on canvas row 26.
const ANGLER_W = 20, ANGLER_H = 30, ANGLER_FEET = 26;
const anglerCache = new Map();

function anglerSprite(look, frame = {}) {
  const bob = frame.bob ? 1 : 0, blink = !!frame.blink;
  const key = JSON.stringify(look) + bob + blink;
  let c = anglerCache.get(key);
  if (c) return c;
  c = makeCanvas(ANGLER_W, ANGLER_H);
  drawAngler(c.getContext('2d'), look, bob, blink);
  addOutline(c);
  if (anglerCache.size > 400) anglerCache.clear();
  anglerCache.set(key, c);
  return c;
}

function drawAngler(g, look, d, blink) {
  const skin = SKIN_TONES[look.skin] || SKIN_TONES[0];
  const hc = HAIR_COLORS[look.hairColor] || HAIR_COLORS[0];
  const tc = TOP_COLORS[look.topColor] || TOP_COLORS[0];
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + 2, y + 2, w, h); };
  const hd = shade(hc, -0.25), hl = shade(hc, 0.3);
  const ts = shade(tc, -0.2), tl = shade(tc, 0.35);
  const cream = '#f4efe6', navy = '#3a4a8a', denim = '#5a6aa8';
  const pants = '#5a3a5a', shoes = '#7a4a3a';

  // --- back hair (behind the head and body)
  if (look.hair === 'long') {
    P(1, 8 + d, 14, 12, hd);
    P(1, 8 + d, 2, 11, hc); P(13, 8 + d, 2, 11, hc);
  }
  if (look.hair === 'pigtails') {
    P(-1, 9 + d, 3, 6, hc); P(14, 9 + d, 3, 6, hc);
    P(-1, 14 + d, 3, 1, hd); P(14, 14 + d, 3, 1, hd);
    P(0, 9 + d, 2, 1, '#e0566e'); P(14, 9 + d, 2, 1, '#e0566e');
  }

  // --- legs
  const legC = look.top === 'overalls' ? denim : look.top === 'sailor' ? tc : pants;
  P(5, 21, 2, 3, legC); P(9, 21, 2, 3, legC);
  P(4, 20, 8, 1, legC);
  P(4, 24, 3, 1, shoes); P(9, 24, 3, 1, shoes);

  // --- arms (skin underneath; sleeves painted over)
  P(3, 15, 1, 5, skin); P(12, 15, 1, 5, skin);
  const sleeves = (rows, col) => { P(3, 15, 1, rows, col); P(12, 15, 1, rows, col); };

  // --- top
  switch (look.top) {
    case 'sweater':
      P(4, 15, 8, 5, tc); sleeves(4, tc);
      P(3, 17, 10, 1, tl); P(4, 19, 8, 1, ts); P(11, 15, 1, 4, ts);
      break;
    case 'overalls':
      P(4, 15, 8, 5, tc); sleeves(2, tc);
      P(5, 17, 6, 4, denim); P(5, 15, 1, 2, denim); P(10, 15, 1, 2, denim);
      P(5, 17, 1, 1, '#ffd23f'); P(10, 17, 1, 1, '#ffd23f');
      P(7, 18, 2, 1, shade(denim, -0.2));
      break;
    case 'hoodie':
      P(4, 15, 8, 5, tc); sleeves(4, tc);
      P(4, 15, 8, 1, ts);
      P(6, 16, 1, 2, cream); P(9, 16, 1, 2, cream);
      P(5, 18, 6, 2, ts);
      break;
    case 'raincoat':
      P(4, 15, 8, 6, tc); P(3, 20, 10, 2, tc); sleeves(4, tc);
      P(5, 15, 2, 1, ts); P(9, 15, 2, 1, ts);
      P(7, 16, 1, 5, ts); P(8, 16, 1, 1, cream); P(8, 18, 1, 1, cream);
      P(3, 21, 10, 1, ts);
      break;
    case 'sailor':
      P(4, 15, 8, 5, cream); sleeves(2, cream);
      P(3, 16, 1, 1, navy); P(12, 16, 1, 1, navy);
      P(4, 15, 8, 1, navy); P(4, 16, 2, 1, navy); P(10, 16, 2, 1, navy);
      P(7, 16, 2, 2, '#e0566e');
      P(4, 19, 8, 1, '#e0dcd4');
      break;
    default: // tee
      P(4, 15, 8, 5, tc); sleeves(2, tc);
      P(11, 15, 1, 5, ts); P(4, 19, 8, 1, ts);
      P(6, 16, 2, 1, tl);
  }

  // --- head
  P(3, 5 + d, 10, 10, skin);
  P(2, 6 + d, 12, 8, skin);

  // --- face
  if (blink) { P(4, 11 + d, 2, 1, OUTLINE); P(10, 11 + d, 2, 1, OUTLINE); }
  else { P(5, 10 + d, 1, 2, OUTLINE); P(10, 10 + d, 1, 2, OUTLINE); }
  P(7, 12 + d, 2, 1, '#8a3a4a');

  switch (look.face) {
    case 'blush':
      P(3, 12 + d, 2, 1, '#ff8fa0'); P(11, 12 + d, 2, 1, '#ff8fa0');
      break;
    case 'freckles': {
      const f = shade(skin, -0.3);
      P(3, 12 + d, 1, 1, f); P(4, 13 + d, 1, 1, f); P(5, 12 + d, 1, 1, f);
      P(10, 12 + d, 1, 1, f); P(11, 13 + d, 1, 1, f); P(12, 12 + d, 1, 1, f);
      break;
    }
    case 'glasses': {
      const fr = '#3b2433';
      for (const x of [4, 9]) {
        P(x, 9 + d, 3, 1, fr); P(x, 12 + d, 3, 1, fr);
        P(x, 10 + d, 1, 2, fr); P(x + 2, 10 + d, 1, 2, fr);
      }
      P(7, 10 + d, 2, 1, fr);
      break;
    }
    case 'shades': {
      const pk = '#ff5c8a';
      for (const x of [4, 9]) {
        P(x, 9 + d, 1, 1, pk); P(x + 2, 9 + d, 1, 1, pk);
        P(x, 10 + d, 3, 1, pk); P(x + 1, 11 + d, 1, 1, pk);
      }
      P(4, 10 + d, 1, 1, '#ffc4d6'); P(9, 10 + d, 1, 1, '#ffc4d6');
      P(7, 10 + d, 2, 1, '#3b2433');
      break;
    }
  }

  // --- hair (front)
  switch (look.hair) {
    case 'short':
      P(3, 4 + d, 10, 1, hc); P(2, 5 + d, 12, 3, hc);
      P(2, 8 + d, 6, 1, hc); P(2, 9 + d, 2, 1, hc); P(13, 8 + d, 1, 2, hc);
      P(4, 5 + d, 3, 1, hl);
      break;
    case 'spiky':
      P(3, 2 + d, 1, 1, hc); P(7, 2 + d, 1, 1, hc); P(11, 2 + d, 1, 1, hc);
      P(2, 3 + d, 3, 1, hc); P(6, 3 + d, 3, 1, hc); P(10, 3 + d, 3, 1, hc);
      P(2, 4 + d, 12, 4, hc);
      P(2, 8 + d, 1, 2, hc); P(4, 8 + d, 2, 1, hc); P(8, 8 + d, 2, 1, hc); P(12, 8 + d, 2, 1, hc);
      P(13, 9 + d, 1, 1, hc);
      P(4, 5 + d, 2, 1, hl);
      break;
    case 'long':
      P(3, 4 + d, 10, 1, hc); P(1, 5 + d, 14, 3, hc);
      P(1, 8 + d, 6, 1, hc); P(9, 8 + d, 6, 1, hc);
      P(1, 9 + d, 2, 6, hc); P(13, 9 + d, 2, 6, hc);
      P(4, 5 + d, 3, 1, hl);
      break;
    case 'pigtails':
      P(3, 4 + d, 10, 1, hc); P(2, 5 + d, 12, 3, hc);
      P(2, 8 + d, 5, 1, hc); P(9, 8 + d, 5, 1, hc);
      P(2, 9 + d, 1, 2, hc); P(13, 9 + d, 1, 2, hc);
      P(4, 5 + d, 3, 1, hl);
      break;
    case 'bun':
      P(7, 1 + d, 2, 1, hc); P(6, 2 + d, 4, 2, hc); P(7, 2 + d, 1, 1, hl);
      P(3, 4 + d, 10, 1, hc); P(2, 5 + d, 12, 3, hc);
      P(2, 8 + d, 4, 1, hc); P(10, 8 + d, 4, 1, hc);
      P(2, 9 + d, 1, 1, hc); P(13, 9 + d, 1, 1, hc);
      P(4, 5 + d, 3, 1, hl);
      break;
    default: // bob
      P(3, 4 + d, 10, 1, hc); P(1, 5 + d, 14, 4, hc);
      P(1, 9 + d, 2, 6, hc); P(13, 9 + d, 2, 6, hc);
      P(1, 14 + d, 2, 1, hd); P(13, 14 + d, 2, 1, hd);
      P(4, 5 + d, 3, 1, hl);
  }

  // --- hat
  switch (look.hat) {
    case 'straw': {
      const s = '#f2c56b', sd = '#c98a3a';
      P(4, 1 + d, 8, 1, s); P(3, 2 + d, 10, 2, s); P(3, 4 + d, 10, 1, '#e0566e');
      P(-1, 5 + d, 18, 1, s); P(0, 6 + d, 16, 1, sd);
      P(5, 2 + d, 1, 1, sd); P(8, 3 + d, 1, 1, sd); P(10, 2 + d, 1, 1, sd);
      break;
    }
    case 'beanie': {
      const c = '#e0566e', cd = '#b83a55';
      P(7, 0 + d, 2, 2, cream);
      P(4, 2 + d, 8, 1, c); P(3, 3 + d, 10, 1, c); P(2, 4 + d, 12, 3, c);
      P(1, 7 + d, 14, 2, cd);
      for (let x = 2; x < 14; x += 2) P(x, 7 + d, 1, 2, shade(cd, -0.15));
      P(4, 3 + d, 2, 1, shade(c, 0.25));
      break;
    }
    case 'bucket': {
      const c = '#8fc9b0', cd = '#5f9a86';
      P(4, 2 + d, 8, 1, c); P(3, 3 + d, 10, 3, c); P(3, 6 + d, 10, 1, cd);
      P(1, 7 + d, 14, 1, c); P(0, 8 + d, 2, 1, c); P(14, 8 + d, 2, 1, c);
      P(5, 3 + d, 2, 1, shade(c, 0.3));
      break;
    }
    case 'cat': {
      const pk = '#ff9ec4';
      P(3, 2 + d, 1, 1, hc); P(3, 3 + d, 2, 1, hc); P(2, 4 + d, 4, 1, hc);
      P(12, 2 + d, 1, 1, hc); P(11, 3 + d, 2, 1, hc); P(10, 4 + d, 4, 1, hc);
      P(4, 4 + d, 1, 1, pk); P(11, 4 + d, 1, 1, pk);
      break;
    }
    case 'flower': {
      const cols = ['#ff9ec4', '#fff3c4', '#ffb86b', '#c79bf2', '#ff8a6b'], leaf = '#6fbf73';
      P(3, 5 + d, 1, 1, leaf); P(6, 4 + d, 1, 1, leaf); P(9, 4 + d, 1, 1, leaf); P(12, 5 + d, 1, 1, leaf);
      P(1, 5 + d, 2, 2, cols[0]); P(4, 4 + d, 2, 2, cols[1]); P(7, 3 + d, 2, 2, cols[2]);
      P(10, 4 + d, 2, 2, cols[3]); P(13, 5 + d, 2, 2, cols[4]);
      break;
    }
    case 'frog': {
      const gc = '#7fcf6f', gd = '#5aa84f';
      P(3, 0 + d, 2, 1, gc); P(11, 0 + d, 2, 1, gc);
      P(2, 1 + d, 4, 3, gc); P(10, 1 + d, 4, 3, gc);
      P(3, 1 + d, 2, 2, '#ffffff'); P(11, 1 + d, 2, 2, '#ffffff');
      P(4, 2 + d, 1, 1, OUTLINE); P(11, 2 + d, 1, 1, OUTLINE);
      P(3, 3 + d, 10, 1, gc); P(2, 4 + d, 12, 4, gc); P(1, 8 + d, 14, 1, gd);
      P(3, 6 + d, 1, 1, '#ff9ec4'); P(12, 6 + d, 1, 1, '#ff9ec4');
      P(6, 6 + d, 4, 1, gd);
      break;
    }
    case 'fishhat': {
      const fc = '#7fb8e6', fb = '#dff1ff', fd = shade(fc, -0.2);
      P(6, 0 + d, 3, 1, fd);
      P(2, 1 + d, 9, 1, fc); P(1, 2 + d, 11, 2, fc); P(2, 4 + d, 9, 1, fb);
      P(12, 2 + d, 1, 2, fc); P(13, 1 + d, 2, 2, fd); P(13, 3 + d, 2, 2, fd);
      P(3, 2 + d, 1, 1, OUTLINE); P(1, 4 + d, 1, 1, fd);
      P(6, 2 + d, 1, 2, fd);
      break;
    }
    case 'crown': {
      const gd = '#ffd23f', gs = '#e0a020';
      P(4, 1 + d, 1, 1, gd); P(7, 1 + d, 2, 1, gd); P(11, 1 + d, 1, 1, gd);
      P(4, 2 + d, 2, 1, gd); P(7, 2 + d, 2, 1, gd); P(10, 2 + d, 2, 1, gd);
      P(4, 3 + d, 8, 1, gd); P(4, 4 + d, 8, 1, gs);
      P(5, 3 + d, 1, 1, '#e0566e'); P(7, 3 + d, 2, 1, '#8fd19e'); P(10, 3 + d, 1, 1, '#7fb8e6');
      break;
    }
  }
}

// ---------------------------------------------------------------- buddies --
const BUDDY_ART = {
  duck: {
    rows: [
      '..yyyy....',
      '.yyyyyy...',
      '.yyyyeyoo.',
      '.yyyyyyoo.',
      '..yyyyy...',
      'yyyyyyyy..',
      'yywwwwyyy.',
      '.yyyyyyy..',
      '..o...o...',
    ],
    pal: { y: '#ffe070', w: '#f5c040', e: OUTLINE, o: '#ff9a3c' },
    blinkRow: 2, bodyKey: 'y',
  },
  cat: {
    rows: [
      'b......b...',
      'bb....bb...',
      'bbsbsbbb...',
      'bebbbbeb...',
      'bbbppbbb..t',
      '.bbbbbb...t',
      '.bbbbbbb.tt',
      'bbbbbbbbbt.',
      'bw.bb.bw...',
    ],
    pal: { b: '#f0a050', s: '#d07a30', e: OUTLINE, p: '#ff8fa0', w: '#fff3e0', t: '#f0a050' },
    blinkRow: 3, bodyKey: 'b',
  },
  frog: {
    rows: [
      '.gg....gg.',
      'gwkg..gkwg',
      'gggggggggg',
      'gpgmmmmgpg',
      '.gllllllg.',
      'gglllllgg.',
      'gg.g..g.gg',
    ],
    pal: { g: '#7fcf6f', w: '#ffffff', k: OUTLINE, p: '#ff9ec4', m: '#4a8a44', l: '#c8f0a0' },
    blinkRow: 1, bodyKey: 'g',
  },
  capy: {
    rows: [
      '.........yy...',
      '........yyyL..',
      '..bbbbbb.rbbr.',
      '.bbbbbbbbbbbbb',
      'bbbbbbbbbbbebb',
      'bbbbbbbbbbbbmm',
      'bbbbbbbbbbbmmn',
      '.bbbbbbbbbbbm.',
      '.bb.bb...bb.bb',
    ],
    pal: { y: '#ffb030', L: '#6fbf73', b: '#b07a50', r: '#8a5a3a', e: OUTLINE, m: '#d4a474', n: '#5a3424' },
    blinkRow: 4, bodyKey: 'b',
  },
};
const buddyCache = new Map();

function buddySprite(id, blink = false) {
  const art = BUDDY_ART[id];
  if (!art) return null;
  const key = id + blink;
  if (buddyCache.has(key)) return buddyCache.get(key);
  let rows = art.rows;
  if (blink) {
    rows = rows.slice();
    rows[art.blinkRow] = rows[art.blinkRow].replace(/[ekw]/g, art.bodyKey);
  }
  const c = addOutline(mapCanvas(rows, art.pal));
  buddyCache.set(key, c);
  return c;
}

// ------------------------------------------------------------------ fish --
const MAP_ART = {
  boot: {
    rows: [
      '..g.........',
      '..bgbb......',
      '..bbbb......',
      '..bdbb......',
      '..bbbb......',
      '..bdbbb.....',
      '..bbbbbbbb..',
      '.bbbbbbbbbbb',
      '.bbbbbbbbbbb',
      '.sssssssssss',
    ],
    pal: { b: '#8a5a3a', d: '#f4efe6', s: '#4a3028', g: '#6fbf73' },
  },
  can: {
    rows: [
      '.cccccc.',
      'cddddddc',
      'cccccccc',
      'pppppppp',
      'pwwpppwp',
      'pppppppp',
      'cccccccc',
      'cccccccc',
      'cddddddc',
      '.cccccc.',
    ],
    pal: { c: '#c8c0d0', d: '#8a8098', p: '#ff8a9a', w: '#ffffff' },
  },
  crab: {
    rows: [
      '.pp......pp.',
      'p.p......p.p',
      'pp..k..k..pp',
      '.p..k..k..p.',
      '..pppppppp..',
      '.pphppppppp.',
      'pppppppppppp',
      '.pllllllllp.',
      'p.p.p..p.p.p',
    ],
    pal: { p: '#ff9a7a', h: '#ffd0c0', l: '#e0705a', k: OUTLINE },
  },
  jelly: {
    rows: [
      '..jjjjj..',
      '.jjjjjjj.',
      'jjhhjjjjj',
      'jjhjjjjjj',
      'jjkjjjkjj',
      'jjjjmjjjj',
      'lllllllll',
      't.t.t.t.t',
      '.t.t.t.t.',
      't.t.t.t.t',
      '.t...t...',
    ],
    pal: { j: '#ff9ed8', h: '#ffe0f4', k: OUTLINE, m: '#e0508a', l: '#e070b0', t: '#ffb8e8' },
  },
  axolotl: {
    rows: [
      '..........g.g.',
      '.........gaaag',
      't......aaaaaaa',
      'ttaaaaaaaaakaa',
      '.taaaaaaaaaaam',
      '..aaaaaaaaaaa.',
      '...a.a...a.a..',
    ],
    pal: { g: '#e0508a', a: '#ffc0d8', k: OUTLINE, m: '#e06a90', t: '#ffb0cc' },
  },
  narwhal: {
    rows: [
      '.....nnnnnn.......',
      '...nnnnnnnnnn.....',
      't.nnnnnnnnnnnn....',
      'ttnnnnnnnnnnknnhhh',
      't.nbnnbnnnnnnnn...',
      '..wwwwwwwwwwww....',
      '....wwwwwwww......',
    ],
    pal: { n: '#8aa0d0', b: '#6a80b8', w: '#e8f0ff', k: OUTLINE, h: '#fff3c4', t: '#6a80b8' },
  },
  bottle: {
    rows: [
      '...gggggggg.',
      'ccgghgggggg.',
      'ccggpppppggg',
      '...gggggggg.',
    ],
    pal: { g: '#8fd1c0', h: '#e0fff8', p: '#fff4e0', c: '#b07a50' },
  },
};

const fishCache = new Map();

function fishSprite(sp, dark = false) {
  const key = sp.id + (dark ? '#dark' : '');
  if (fishCache.has(key)) return fishCache.get(key);
  let c;
  if (dark) {
    c = silhouette(fishSprite(sp));
  } else {
    if (sp.map) c = mapCanvas(MAP_ART[sp.map].rows, MAP_ART[sp.map].pal);
    else if (sp.shape === 'eel') c = drawEel(sp);
    else if (sp.shape === 'puffer') c = drawPuffer(sp);
    else c = drawFishBody(sp);
    addOutline(c);
  }
  fishCache.set(key, c);
  return c;
}

function fishDataUrl(sp, dark = false) {
  return spriteDataUrl('fish:' + sp.id + dark, () => fishSprite(sp, dark));
}

// Decides the colour of one body pixel from the fish's pattern.
function patternColor(sp, x, y, isBelly, rng, t) {
  const base = isBelly ? sp.belly : sp.body;
  const seed = hashStr(sp.id) % 100;
  switch (sp.pattern) {
    case 'stripes':
      return !isBelly && x % 4 === 1 && t < 0.72 ? sp.accent : base;
    case 'spots':
      return !isBelly && t < 0.78 && rng() < 0.17 ? sp.accent : base;
    case 'patches': {
      const n = Math.sin(x * 0.9 + seed) + Math.sin(y * 1.3 + seed * 1.7) + Math.sin((x + y) * 0.55 + seed * 0.3);
      return n > 0.9 ? sp.accent : base;
    }
    case 'stars':
      return rng() < 0.08 ? sp.accent : base;
    case 'gradient':
      return isBelly ? base : lerpColor(sp.accent, sp.body, Math.min(1, t * 1.4));
    default:
      return base;
  }
}

function drawFishBody(sp) {
  const round = sp.shape === 'round';
  const L = sp.len, Hh = sp.h;
  const T = Math.max(3, Math.round(Hh * (round ? 0.4 : 0.55)));
  const w = T + L + 4 + (sp.bill ? 7 : 0), h = Hh + (sp.bill ? 9 : 6);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const rng = mulberry32(hashStr(sp.id));
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const cx = 1 + T + L / 2, cy = h / 2 + (sp.bill ? 1.5 : 0), rx = L / 2, ry = Hh / 2;
  const inBody = (x, y) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy <= 1;
  };

  // tail (forked unless round)
  for (let x = 1; x <= T + 1; x++) {
    const k = (T + 1 - x) / T;
    const spread = 0.8 + k * ry * (round ? 0.8 : 0.95);
    for (let y = 0; y < h; y++) {
      const dy = Math.abs(y + 0.5 - cy);
      if (dy > spread) continue;
      if (!round && k > 0.5 && dy < spread * 0.4) continue;
      px(x, y, sp.fin);
    }
  }

  // fins: dorsal on top, a small one underneath
  const topOf = x => { for (let y = 0; y < h; y++) if (inBody(x, y)) return y; return -1; };
  const botOf = x => { for (let y = h - 1; y >= 0; y--) if (inBody(x, y)) return y; return -1; };
  const f0 = Math.floor(cx - rx * (round ? 0.5 : 0.4)), f1 = Math.floor(cx + rx * (round ? 0.3 : 0.15));
  for (let x = f0; x <= f1; x++) {
    const top = topOf(x);
    if (top < 1) continue;
    px(x, top - 1, sp.fin);
    if ((x - f0) > (f1 - f0) * 0.2 && (x - f0) < (f1 - f0) * 0.7 && top > 1) px(x, top - 2, sp.fin);
    if (sp.bill && (x - f0) > (f1 - f0) * 0.1 && (x - f0) < (f1 - f0) * 0.8) { px(x, top - 3, sp.fin); px(x, top - 4, sp.fin); }
  }
  for (let x = Math.floor(cx - 2); x <= Math.floor(cx); x++) {
    const b = botOf(x);
    if (b > 0 && b < h - 1) px(x, b + 1, sp.fin);
  }
  if (round) {
    const x = Math.floor(cx - rx * 0.1), b = botOf(x);
    if (b > 0 && b < h - 2) { px(x - 1, b + 1, sp.fin); px(x - 1, b + 2, sp.fin); }
  }

  // body
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inBody(x, y)) continue;
      const isBelly = (y + 0.5 - cy) > ry * 0.3;
      const t = (x + 0.5 - (cx - rx)) / (2 * rx);
      px(x, y, patternColor(sp, x, y, isBelly, rng, t));
    }
  }

  // gill line
  const gx = Math.round(cx + rx * 0.3);
  for (let y = 0; y < h; y++) {
    if (inBody(gx, y) && Math.abs(y + 0.5 - cy) < ry * 0.55 && (y + 0.5 - cy) <= ry * 0.3) px(gx, y, shade(sp.body, -0.18));
  }

  // eye + mouth
  const ex = Math.floor(cx + rx * 0.58), ey = Math.floor(cy - ry * 0.25);
  if (Hh >= 9) { g.fillStyle = OUTLINE; g.fillRect(ex - 1, ey - 1, 2, 2); px(ex - 1, ey - 1, '#ffffff'); }
  else px(ex, ey, OUTLINE);
  const mx = Math.floor(cx + rx) - 1, my = Math.floor(cy + ry * 0.15);
  px(mx, my, shade(sp.body, -0.3));

  if (sp.bill) for (let i = 1; i <= 7; i++) px(mx + i, my - 1, shade(sp.body, 0.2));
  if (sp.whiskers) {
    px(mx + 1, my + 1, sp.fin); px(mx + 2, my + 2, sp.fin); px(mx + 3, my + 2, sp.fin);
  }
  return c;
}

function drawEel(sp) {
  const L = sp.len, w = L + 6, h = 13;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const rng = mulberry32(hashStr(sp.id));
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const cy = h / 2;
  const center = x => {
    const t = (x - 1) / (L - 1);
    return cy + Math.sin(x * 0.42) * 1.8 * (1 - t * 0.8);
  };
  for (let x = 1; x <= L; x++) {
    const t = (x - 1) / (L - 1);
    let half = t < 0.3 ? 0.6 + (t / 0.3) * 1.7 : 2.3;
    if (t > 0.9) half = 2.3 - ((t - 0.9) / 0.1) * 1.2;
    const yc = center(x);
    if (t > 0.18 && t < 0.86) px(x, Math.floor(yc - half) - 1, sp.fin);
    for (let y = 0; y < h; y++) {
      const dy = y + 0.5 - yc;
      if (Math.abs(dy) > half) continue;
      const isBelly = dy > half * 0.25;
      let col = isBelly ? sp.belly : sp.body;
      if (sp.pattern === 'stripes' && !isBelly && x % 4 === 0 && t < 0.85) col = sp.accent;
      if (sp.pattern === 'spots' && !isBelly && t < 0.85 && rng() < 0.2) col = sp.accent;
      px(x, y, col);
    }
  }
  const hx = L - 2, hy = Math.floor(center(L - 2) - 1);
  px(hx, hy, OUTLINE);
  if (sp.whiskers) {
    const my = Math.floor(center(L)) + 1;
    px(L + 1, my, sp.fin); px(L + 2, my + 1, sp.fin); px(L + 3, my + 1, sp.fin);
    px(L + 1, my - 3, sp.fin); px(L + 2, my - 4, sp.fin);
  }
  return c;
}

function drawPuffer(sp) {
  const r = sp.r, w = r * 2 + 9, h = r * 2 + 7;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const rng = mulberry32(hashStr(sp.id));
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const cx = 4 + r + 0.5, cy = h / 2;
  // tail
  for (let y = Math.floor(cy) - 2; y <= Math.floor(cy) + 1; y++) px(1, y, sp.fin);
  for (let y = Math.floor(cy) - 1; y <= Math.floor(cy); y++) { px(2, y, sp.fin); px(3, y, sp.fin); }
  // spikes
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
    if (Math.abs(Math.cos(a) + 1) < 0.2) continue;
    px(Math.round(cx + Math.cos(a) * (r + 1.2) - 0.5), Math.round(cy + Math.sin(a) * (r + 1.2) - 0.5), sp.fin);
  }
  // body
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const isBelly = dy > r * 0.25;
      let col = isBelly ? sp.belly : sp.body;
      if (!isBelly && rng() < 0.14) col = sp.accent;
      px(x, y, col);
    }
  }
  const ex = Math.floor(cx + r * 0.45), ey = Math.floor(cy - r * 0.35);
  g.fillStyle = OUTLINE; g.fillRect(ex - 1, ey, 2, 2); px(ex - 1, ey, '#ffffff');
  px(Math.floor(cx + r) - 1, Math.floor(cy + 1), '#e0566e');
  return c;
}
