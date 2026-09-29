// Tiny Tides — the game: saving, the scene, and the fishing state machine.
// The canvas is only 320x180 pixels; CSS scales it up with nearest-neighbour
// filtering, which is what keeps everything crisp and pixelated.

// ================================================================== save ==
const SAVE_KEY = 'tiny-tides-save-v1';

function freshSave() {
  return {
    started: false, name: '', look: { ...DEFAULT_LOOK }, owned: [],
    coins: 0, bucket: [], aquarium: [], dex: {}, rod: 'twig', rods: ['twig'], bucketLvl: 0, tankLvl: 0,
    location: 'dock', unlocked: ['dock'], newSpot: false,
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
  if (!Array.isArray(s.aquarium)) s.aquarium = [];
  s.aquarium = s.aquarium.filter(c => c && FISH_BY_ID[c.id] && Number.isFinite(c.value));
  s.tankLvl = inRange(s.tankLvl, TANKS, 0);
  if (!s.dex || typeof s.dex !== 'object') s.dex = {};
  for (const id of Object.keys(s.dex)) if (!FISH_BY_ID[id]) delete s.dex[id];
  if (!Array.isArray(s.rods) || !s.rods.includes('twig')) s.rods = ['twig'];
  if (!RODS.some(r => r.id === s.rod) || !s.rods.includes(s.rod)) s.rod = 'twig';
  s.bucketLvl = inRange(s.bucketLvl, BUCKETS, 0);
  s.coins = Math.max(0, Math.floor(Number(s.coins) || 0));
  s.clock = Number(s.clock) || 0;
  s.name = String(s.name || '').slice(0, 14);
  // unlocked spots are always recomputed from how many fish you've caught
  const count = fishCaughtCount(s);
  s.unlocked = LOCATIONS.filter(l => s.devUnlocked || l.need <= count).map(l => l.id);
  if (!s.unlocked.includes(s.location)) s.location = 'dock';
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
  initShadows();
}

const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));
const fishWhere = f => f.where || ['dock'];

// Real fish only: junk doesn't count toward unlocking new spots.
function fishCaughtCount(s = save) {
  let n = 0;
  for (const [id, d] of Object.entries(s.dex || {})) {
    const sp = FISH_BY_ID[id];
    if (sp && sp.rarity !== 'junk') n += Number(d.count) || 0;
  }
  return n;
}

const save = loadSave();

const currentRod = () => RODS.find(r => r.id === save.rod) || RODS[0];
const currentLoc = () => LOCATIONS.find(l => l.id === save.location) || LOCATIONS[0];
const bucketCap = () => BUCKETS[save.bucketLvl].cap;
const tankCap = () => TANKS[save.tankLvl].cap;
const findCosmetic = (cat, id) => COSMETICS[cat].find(i => i.id === id);
const ownsCosmetic = (cat, id) => {
  const item = findCosmetic(cat, id);
  return !!item && (item.price === 0 || save.owned.includes(cat + ':' + id));
};

// ================================================================ scene ==
const W = 320, H = 180, HORIZON = 96;
const CHAR_X = 92, FEET_Y = 131;
const ROD_LEN = 28;
const WATER = { x0: 136, x1: 312, y0: 105, y1: 172 };
const REEL_END = { x: 140, y: 146 };

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const fg = makeCanvas(W, H);
const fgx = fg.getContext('2d');
const skyCanvas = makeCanvas(W, HORIZON);
const waterCanvas = makeCanvas(W, H - HORIZON);
let gradientKey = '', gradientAge = 99;

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
// Each iceberg is a peak; columns right of a summit are drawn in shadow.
const ICE_PEAKS = [[214, 22, 14], [236, 14, 9], [292, 26, 18], [40, 30, 8], [70, 12, 5]];
const ICEBERGS = Array.from({ length: W }, (_, x) => {
  let best = { h: 0, shaded: false };
  for (const [c, w, h] of ICE_PEAKS) {
    const v = h * (1 - Math.abs(x - c) / w);
    if (v > best.h) best = { h: v, shaded: x > c };
  }
  return { h: Math.round(best.h), shaded: best.shaded };
});
const CLOUDS = [
  { x: 40, y: 22, w: 34, v: 2.2 }, { x: 150, y: 38, w: 26, v: 3 },
  { x: 250, y: 16, w: 42, v: 1.6 }, { x: 330, y: 52, w: 22, v: 3.6 },
];
const WAVES = Array.from({ length: 70 }, () => {
  const depth = sceneRng();
  return { x: sceneRng() * W, y: HORIZON + 2 + Math.floor(depth * depth * (H - HORIZON - 3)), d: depth, dir: sceneRng() < 0.5 ? -1 : 1 };
});
const REEDS = Array.from({ length: 9 }, (_, i) => ({ x: 292 + i * 3 + Math.floor(sceneRng() * 2), h: 12 + Math.floor(sceneRng() * 14), tail: sceneRng() < 0.5, p: sceneRng() * 6 }));
const FIREFLIES = Array.from({ length: 10 }, () => ({ x: rand(10, 140), y: rand(95, 150), a: rand(0.3, 0.8), b: rand(0.3, 0.8), p: rand(0, 6) }));
const SNOW = Array.from({ length: 45 }, () => ({ x: sceneRng() * W, y: sceneRng() * H, v: 6 + sceneRng() * 8, p: sceneRng() * 6 }));
const LILY_PADS = {
  dock: [[182, 168, 6], [232, 176, 7], [206, 160, 4]],
  lagoon: [[150, 164, 7], [182, 168, 6], [232, 176, 8], [206, 158, 4], [262, 150, 5], [290, 166, 7], [170, 130, 3], [240, 122, 3], [300, 136, 4]],
};

// ================================================================ state ==
const G = {
  state: 'idle', t: 0, time: 0, down: false, keys: new Set(), steer: null,
  aim: { x: 230, y: 140 }, aimPointerAt: -99,
  rodA: 0.55, platY: 0,
  bob: { x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, dip: 0 },
  hooked: null, nibblesLeft: 0, nibbleT: 0, lureT: 0, strayAt: 0, hinted: false,
  bite: null, reel: null, landing: null, pending: null, travel: null,
  ripples: [], particles: [], birds: [], birdTimer: 5,
  blinkT: 2, blinking: 0, buddyBlinkT: 3, buddyBlinking: 0, cheer: 0,
  pal: null, phaseId: 'golden', lastPhaseId: null,
  msgTimer: 0,
  dev: { fish: '', instant: false },  // set from the dev panel (dev.js)
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

// Each location nudges the sky and water toward its own colours.
function tintForLocation(pal) {
  const t = currentLoc().tint;
  if (!t) return pal;
  const k = t.amount * (1 - pal.night * 0.55);
  pal.sky = pal.sky.map(c => lerpColor(c, t.sky, k));
  pal.water = pal.water.map(c => lerpColor(c, t.water, Math.min(1, k * 1.3)));
  pal.refl = lerpColor(pal.refl, t.sky, k * 0.5);
  pal.hills = lerpColor(pal.hills, shade(t.water, -0.45), k);
  pal.hillsFar = lerpColor(pal.hillsFar, shade(t.sky, -0.3), k);
  return pal;
}

function setState(s) { G.state = s; G.t = 0; }

function showMessage(text, seconds = 1.8) {
  setPrompt(text);
  G.msgTimer = seconds;
}

function idlePrompt() {
  if (save.bucket.length >= bucketCap()) return 'Bucket full! Sell some fish, or sell straight from the line.';
  return 'Tap the water to cast. Aim just ahead of a fish shadow!';
}

// ================================================================ input ==
// pos is where on the canvas the player tapped (null = keyboard / button).
function press(pos = null) {
  if (G.down) return;
  G.down = true;
  switch (G.state) {
    case 'idle':
      castTo(pos || G.aim);
      break;
    case 'waiting':
      spookAll(G.bob.x, G.bob.y, 40);
      setState('retract');
      showMessage('You reeled in early and scared the fish. Wait for the bobber to sink!');
      break;
    case 'bite':
      startReel();
      break;
  }
}

function release() {
  G.down = false;
}

function cancelInput() { G.down = false; G.keys.clear(); G.steer = null; }

function setAim(pos) {
  G.aim.x = clamp(pos.x, WATER.x0, WATER.x1);
  G.aim.y = clamp(pos.y, WATER.y0, WATER.y1);
  G.aimPointerAt = G.time;
}

// ============================================================== shadows ==
// Every shadow under the water is a real fish that has already been rolled.
// Bigger shadows are rarer fish, so you can pick your target.
const SHADOW_SIZE = { junk: 0.65, common: 0.8, uncommon: 1.15, rare: 1.5, legendary: 1.95, goat: 2.1 };
const SHADOWS = Array.from({ length: 5 }, () => ({ mode: 'gone', respawn: 0 }));

function spawnShadow(s, fadeIn = true) {
  s.sp = rollFish();
  s.size = SHADOW_SIZE[s.sp.rarity] * rand(0.9, 1.1);
  s.x = rand(WATER.x0 + 8, WATER.x1 - 4);
  s.y = rand(WATER.y0 + 3, WATER.y1);
  const speed = s.sp.rarity === 'junk' ? rand(0.8, 1.6) : rand(4, 9);
  s.vx = speed * (Math.random() < 0.5 ? -1 : 1);
  s.vy = 0;
  s.dir = Math.sign(s.vx);
  s.alpha = fadeIn ? 0 : 1;
  s.t = rand(0, 6);
  s.mode = 'swim';
}

function initShadows() {
  G.phaseId = phaseInfo().id;
  SHADOWS.forEach(s => spawnShadow(s, false));
}

function flee(s, fromX, fromY) {
  if (!s || s.mode === 'gone' || s.mode === 'flee') return;
  s.mode = 'flee';
  const ang = Math.atan2(s.y - fromY, s.x - fromX) || rand(0, 6);
  s.vx = Math.cos(ang) * 45;
  s.vy = Math.sin(ang) * 18;
  s.dir = Math.sign(s.vx) || 1;
}

function spookAll(x, y, r) {
  for (const s of SHADOWS) {
    if (['interested', 'nibble', 'hooked'].includes(s.mode) || (s.mode === 'swim' && Math.hypot(s.x - x, (s.y - y) * 1.8) < r * 0.5)) flee(s, x, y);
  }
}

const shadowFits = s => s.sp && s.sp.phases.includes(G.phaseId) && fishWhere(s.sp).includes(save.location);

function updateShadows(dt) {
  for (const s of SHADOWS) {
    s.t = (s.t || 0) + dt;
    switch (s.mode) {
      case 'gone':
        s.respawn -= dt;
        if (s.respawn <= 0 && G.state !== 'sailing') spawnShadow(s);
        break;
      case 'flee':
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.alpha -= dt * 1.3;
        if (s.alpha <= 0) { s.mode = 'gone'; s.respawn = rand(2.5, 6); }
        break;
      case 'swim':
        s.alpha = Math.min(1, s.alpha + dt * 0.5);
        s.x += s.vx * dt;
        s.y = clamp(s.y + Math.sin(s.t * 0.7) * dt * 2, WATER.y0, WATER.y1 + 2);
        if (s.x < WATER.x0 + 4 || s.x > WATER.x1) { s.vx = -s.vx; s.x = clamp(s.x, WATER.x0 + 4, WATER.x1); }
        if (Math.random() < dt * 0.1) s.vx = -s.vx;
        s.dir = Math.sign(s.vx) || s.dir;
        if (!shadowFits(s)) { s.mode = 'flee'; s.vy = 0; }
        break;
      case 'interested': {
        s.alpha = Math.min(1, s.alpha + dt);
        s.delay -= dt;
        if (s.delay > 0) { s.x += s.vx * 0.3 * dt; break; }
        const tx = G.bob.x - s.dir * 3, ty = G.bob.y + 2;
        const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
        const sp = 10 + s.size * 3;
        if (d < 1.5) {
          s.mode = 'nibble';
          G.hooked = s;
          G.nibblesLeft = Math.floor(rand(0, 3));
          G.nibbleT = rand(0.4, 0.9);
        } else {
          s.x += (dx / d) * sp * dt; s.y += (dy / d) * sp * dt;
          if (Math.abs(dx) > 1) s.dir = Math.sign(dx);
        }
        break;
      }
      case 'nibble':
        s.x = G.bob.x - s.dir * 3 + Math.sin(s.t * 12) * 0.6;
        s.y = G.bob.y + 2;
        break;
      case 'hooked': {
        const thrash = Math.sin(s.t * 14) * 1.2;
        s.x = G.bob.x + 3 * s.dir + thrash; s.y = G.bob.y + 2;
        break;
      }
    }
  }
}

// ============================================================== fishing ==
function hand() { return { x: CHAR_X + 4, y: FEET_Y - 6 + G.platY }; }

function rodTip(a = G.rodA) {
  const h = hand();
  return { x: h.x + Math.sin(a) * ROD_LEN, y: h.y - Math.cos(a) * ROD_LEN };
}

function castTo(pos) {
  const tip = rodTip(1.0);
  G.bob.sx = tip.x; G.bob.sy = tip.y;
  G.bob.tx = clamp(pos.x + rand(-2, 2), WATER.x0, WATER.x1);
  G.bob.ty = clamp(pos.y + rand(-1, 1), WATER.y0, WATER.y1);
  G.bob.x = G.bob.sx; G.bob.y = G.bob.sy;
  setState('casting');
  Sound.sfx.cast();
  setPrompt('Whoosh...');
}

function landBobber() {
  const b = G.bob;
  b.x = b.tx; b.y = b.ty;
  addRipple(b.x, b.y, 1);
  splash(b.x, b.y, 6);
  Sound.sfx.splash();
  G.hooked = null;
  G.lureT = 0.5;
  G.strayAt = G.dev.instant ? 0.7 : rand(9, 13) * currentRod().wait;
  G.hinted = false;
  setState('waiting');

  // landing right on top of a fish spooks it; just ahead of one gets its attention
  let scared = false, best = null, bestD = 1e9;
  for (const s of SHADOWS) {
    if (s.mode !== 'swim' || s.alpha < 0.4) continue;
    const d = Math.hypot(s.x - b.x, (s.y - b.y) * 1.8);
    if (d < 4 + s.size * 3) { flee(s, b.x, b.y); scared = true; }
    else if (d < 40 && d < bestD) { best = s; bestD = d; }
  }
  if (best) interest(best);
  if (scared) {
    Sound.sfx.spook();
    showMessage('Splash! You landed right on it and spooked it. Aim a little ahead next time.', 2.4);
  } else {
    setPrompt(best ? 'Something noticed your bobber...' : 'Waiting... (casting near a shadow is faster)');
  }
}

function interest(s) {
  s.mode = 'interested';
  s.delay = rand(0.3, 1.4) * currentRod().wait;
  s.dir = G.bob.x > s.x ? 1 : -1;
}

function rollFish(stray = false) {
  const rod = currentRod();
  const pool = FISH.filter(f => f.phases.includes(G.phaseId) && fishWhere(f).includes(save.location));
  const weightOf = f => {
    if (f.weight !== undefined) return f.weight;
    let w = RARITY[f.rarity].weight;
    if (f.rarity === 'rare') w *= 1 + rod.luck * 5;
    if (f.rarity === 'legendary') w *= 1 + rod.luck * 8;
    if (f.rarity === 'junk') w *= Math.max(0.2, 1 - rod.luck * 3) * (stray ? 3 : 1);
    // spread the weight of a rarity across its members
    return w / pool.filter(o => o.rarity === f.rarity && o.weight === undefined).length;
  };
  const total = pool.reduce((s, f) => s + weightOf(f), 0);
  let r = Math.random() * total;
  for (const f of pool) { r -= weightOf(f); if (r <= 0) return f; }
  return pool[pool.length - 1];
}

function startBite(shadow) {
  if (shadow) {
    shadow.mode = 'hooked';
    G.bite = shadowFits(shadow) ? shadow.sp : rollFish();
  } else {
    G.bite = rollFish(true);
  }
  if (G.dev.fish && FISH_BY_ID[G.dev.fish]) G.bite = FISH_BY_ID[G.dev.fish];
  G.hooked = shadow;
  setState('bite');
  addRipple(G.bob.x, G.bob.y, 1.2);
  splash(G.bob.x, G.bob.y, 5);
  Sound.sfx.nibble(); Sound.sfx.bite();
  setPrompt('!! TAP NOW !!');
}

// --- reeling: a 2D chase. Steer the net with the arrow keys (or drag) and
// keep the fish inside it until the catch bar fills.
const RP = { x: 34, y: 8, w: 252, h: 138 };  // the underwater panel, in canvas pixels
const KEY_DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

function startReel() {
  const rod = currentRod();
  G.reel = {
    sp: G.bite, net: rod.net,
    fx: RP.w * 0.6, fy: RP.h * 0.45, tx: RP.w * 0.6, ty: RP.h * 0.45, timer: 0.8, dir: -1,
    nx: RP.w * 0.42, ny: RP.h * 0.5, vx: 0, vy: 0,
    progress: 0.35, grace: 0.9, tick: 0, inNet: false, bubbles: [],
  };
  setState('reeling');
  Sound.sfx.bite();
  setPrompt('Chase it! Arrow keys / WASD (or drag) to keep the fish in your net.');
}

function updateReel(dt) {
  const r = G.reel, d = r.sp.diff, rod = currentRod();
  const m = 14;

  // the fish picks somewhere new to swim every so often, sometimes darting far
  r.timer -= dt;
  if (r.timer <= 0) {
    const dart = Math.random() < d * 0.05;
    r.tx = dart ? (r.fx < RP.w / 2 ? rand(RP.w * 0.65, RP.w - m) : rand(m, RP.w * 0.35)) : clamp(r.fx + rand(-90, 90), m, RP.w - m);
    r.ty = dart ? rand(m, RP.h - 20) : clamp(r.fy + rand(-55, 55), m, RP.h - 20);
    r.timer = rand(0.5, 1.4) / (0.6 + d * 0.22);
  }
  // eases toward its target, but never faster than the net can follow
  const k = Math.min(1, dt * (0.8 + d * 0.4));
  let dx = (r.tx - r.fx) * k, dy = (r.ty - r.fy) * k;
  const maxStep = (35 + d * 14) * dt, step = Math.hypot(dx, dy);
  if (step > maxStep) { dx *= maxStep / step; dy *= maxStep / step; }
  r.fx += dx;
  r.fy += dy + Math.sin(G.time * (3 + d)) * d * 0.06;
  if (Math.abs(dx) > 0.05) r.dir = Math.sign(dx);
  if (Math.random() < dt * 2) r.bubbles.push({ x: r.fx + r.dir * 6, y: r.fy - 2, v: rand(12, 22) });

  // the net: keys (or a finger) push it around, water drag slows it down
  let ax = 0, ay = 0;
  for (const key of G.keys) { const v = KEY_DIRS[key]; if (v) { ax += v[0]; ay += v[1]; } }
  if (G.steer) {
    const sx = G.steer.x - RP.x - r.nx, sy = G.steer.y - RP.y - r.ny, dist = Math.hypot(sx, sy);
    if (dist > 2) { const pull = Math.min(1, dist / 18); ax += (sx / dist) * pull; ay += (sy / dist) * pull; }
  }
  const len = Math.hypot(ax, ay);
  if (len > 1) { ax /= len; ay /= len; }
  r.vx += ax * 800 * dt; r.vy += ay * 800 * dt;
  const drag = Math.exp(-5 * dt);
  r.vx *= drag; r.vy *= drag;
  const sp = Math.hypot(r.vx, r.vy);
  if (sp > 150) { r.vx *= 150 / sp; r.vy *= 150 / sp; }
  r.nx += r.vx * dt; r.ny += r.vy * dt;
  if (r.nx < r.net || r.nx > RP.w - r.net) { r.nx = clamp(r.nx, r.net, RP.w - r.net); r.vx = 0; }
  if (r.ny < r.net || r.ny > RP.h - r.net) { r.ny = clamp(r.ny, r.net, RP.h - r.net); r.vy = 0; }

  r.inNet = Math.hypot(r.fx - r.nx, r.fy - r.ny) < r.net;
  if (r.inNet) {
    r.progress += rod.gain * dt;
    r.tick -= dt;
    if (r.tick <= 0) { Sound.sfx.reel(); r.tick = 0.07; }
  } else if (r.grace > 0) {
    r.grace -= dt;
  } else {
    r.progress -= (0.1 + d * 0.03) * dt;
  }
  if (Math.random() < dt * 3) r.bubbles.push({ x: rand(0, RP.w), y: RP.h - 8, v: rand(8, 18) });
  r.bubbles = r.bubbles.filter(b => (b.y -= b.v * dt) > 0);

  // meanwhile, up top, the bobber gets dragged toward the dock
  const pull = clamp(r.progress, 0, 1) * 0.45;
  G.bob.x = lerp(G.bob.tx, REEL_END.x, pull) + (r.fx / RP.w - 0.5) * 14;
  G.bob.y = lerp(G.bob.ty, REEL_END.y, pull) + Math.sin(G.time * 9) * 0.6;
  if (Math.random() < dt * 5) splash(G.bob.x, G.bob.y, 2);

  if (r.progress >= 1) catchFish();
  else if (r.progress <= 0) escape(['rare', 'legendary'].includes(r.sp.rarity) ? 'It felt huge... it got away!' : 'It slipped off the hook!');
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
  if (G.hooked) { G.hooked.mode = 'gone'; G.hooked.respawn = rand(2, 5); G.hooked = null; }
  checkUnlocks();
  persist();
  G.landing = { sx: G.bob.x, sy: G.bob.y };
  G.reel = null;
  setState('landing');
  splash(G.bob.x, G.bob.y, 12);
  Sound.sfx.catch(sp.rarity === 'goat' ? 'legendary' : sp.rarity);
  setPrompt(isNew ? 'A new species!' : 'Got one!');
}

function escape(msg) {
  G.reel = null;
  flee(G.hooked, REEL_END.x, REEL_END.y);
  G.hooked = null;
  setState('retract');
  Sound.sfx.escape();
  showMessage(msg, 2.2);
}

function checkUnlocks() {
  const count = fishCaughtCount();
  for (const loc of LOCATIONS) {
    if (loc.need <= count && !save.unlocked.includes(loc.id)) {
      save.unlocked.push(loc.id);
      save.newSpot = true;
      setTimeout(() => {
        toast(`New spot on the map: ${loc.name}!`, 'coin');
        Sound.sfx.unlock();
        refreshHUD();
      }, 1400);
    }
  }
}

// Called by the catch card: 'keep', 'sell' or 'release'.
function finishCatch(action) {
  const c = G.pending;
  if (!c) return;
  G.pending = null;
  if (action === 'sell' && isUnsellable(c)) action = save.aquarium.length < tankCap() ? 'tank' : 'keep';
  if (action === 'keep' && save.bucket.length < bucketCap()) {
    save.bucket.push(c);
    toast(`${FISH_BY_ID[c.id].name} went in the bucket`);
  } else if (action === 'tank' && save.aquarium.length < tankCap()) {
    save.aquarium.push(c);
    toast(`${FISH_BY_ID[c.id].name} moved into the ${TANKS[save.tankLvl].name.toLowerCase()}!`);
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

// =============================================================== travel ==
const canTravel = () => ['idle', 'waiting', 'retract'].includes(G.state);

function sailTo(id) {
  const loc = LOCATIONS.find(l => l.id === id);
  if (!loc || !save.unlocked.includes(id) || id === save.location || !canTravel()) return false;
  spookAll(G.bob.x, G.bob.y, 999);
  G.travel = { to: loc, t: 0, switched: false };
  setState('sailing');
  Sound.sfx.sail();
  setPrompt(`Sailing to ${loc.name}...`);
  return true;
}

function updateTravel(dt) {
  const tr = G.travel;
  tr.t += dt;
  if (!tr.switched && tr.t >= 1.6) {
    tr.switched = true;
    save.location = tr.to.id;
    initShadows();
    gradientAge = 99;
    persist();
    refreshHUD();
  }
  if (tr.t >= 3.3) {
    G.travel = null;
    setState('idle');
    toast(`Welcome to ${tr.to.name}!`);
    setPrompt(idlePrompt());
  }
}

// ============================================================== economy ==
function earn(amount) {
  save.coins += amount;
  save.stats.earned += amount;
  toast(`+${amount} coins`, 'coin');
  refreshHUD();
}

const isUnsellable = c => !!FISH_BY_ID[c.id].unsellable;

function sellFish(uid) {
  const i = save.bucket.findIndex(c => c.uid === uid);
  if (i < 0 || isUnsellable(save.bucket[i])) return;
  const [c] = save.bucket.splice(i, 1);
  save.stats.sold++;
  earn(c.value);
  Sound.sfx.coin();
  persist();
}

function sellFromTank(uid) {
  const i = save.aquarium.findIndex(c => c.uid === uid);
  if (i < 0 || isUnsellable(save.aquarium[i])) return;
  const [c] = save.aquarium.splice(i, 1);
  save.stats.sold++;
  earn(c.value);
  Sound.sfx.coin();
  persist();
}

function moveToTank(uid) {
  const i = save.bucket.findIndex(c => c.uid === uid);
  if (i < 0 || save.aquarium.length >= tankCap()) return false;
  save.aquarium.push(save.bucket.splice(i, 1)[0]);
  Sound.sfx.buy();
  persist();
  refreshHUD();
  return true;
}

// Sells everything in the bucket except anything marked unsellable.
function sellAll() {
  const selling = save.bucket.filter(c => !isUnsellable(c));
  if (!selling.length) return;
  const total = selling.reduce((s, c) => s + c.value, 0);
  save.stats.sold += selling.length;
  save.bucket = save.bucket.filter(isUnsellable);
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
const FISHING_STATES = ['casting', 'waiting', 'bite', 'reeling'];

function update(dt) {
  G.time += dt;
  if (save.started) save.clock += dt;

  const ph = phaseInfo();
  G.pal = tintForLocation(mixPhase(ph.cur, ph.next, ph.blend));
  G.phaseId = ph.id;
  if (G.phaseId !== G.lastPhaseId) {
    const first = G.lastPhaseId === null;
    G.lastPhaseId = G.phaseId;
    if (first) initShadows();
    Sound.setMood(G.phaseId);
    refreshHUD();
    if (!first && save.started) toast(PHASES.find(p => p.id === G.phaseId).arrive);
  }
  G.platY = currentLoc().platform === 'boat' ? Math.round(Math.sin(G.time * 1.8) * 0.8) : 0;

  // idle aim marker drifts on its own unless the mouse is steering it
  if (G.time - G.aimPointerAt > 2.5) {
    G.aim.x = 226 + Math.sin(G.time * 0.45) * 70;
    G.aim.y = 140 + Math.sin(G.time * 0.7) * 22;
  }

  // a menu opened mid-cast pauses the fishing (but not the scenery)
  const paused = openId && openId !== 'modal-catch' && FISHING_STATES.includes(G.state);
  if (!paused) {
    G.t += dt;
    updateState(dt);
    updateShadows(dt);
  }

  if (G.msgTimer > 0) {
    G.msgTimer -= dt;
    if (G.msgTimer <= 0 && G.state === 'idle') setPrompt(idlePrompt());
  }

  // rod angle eases toward a pose for each state
  const poses = {
    idle: 0.55 + Math.sin(G.time * 1.5) * 0.03,
    casting: 1.05, waiting: 0.8 + G.bob.dip * 0.12, bite: 1.0 + Math.sin(G.time * 30) * 0.05,
    reeling: 0.3 + Math.sin(G.time * 22) * 0.04,
    retract: 0.3, landing: 0.2, showing: 0.4, sailing: 0.2,
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

function updateState(dt) {
  switch (G.state) {
    case 'casting': {
      const k = Math.min(1, G.t / 0.6);
      const far = (G.bob.tx - WATER.x0) / (WATER.x1 - WATER.x0);
      G.bob.x = lerp(G.bob.sx, G.bob.tx, k);
      G.bob.y = lerp(G.bob.sy, G.bob.ty, k) - Math.sin(Math.PI * k) * (28 + far * 30);
      if (k >= 1) landBobber();
      break;
    }
    case 'waiting': {
      G.bob.dip = Math.max(0, G.bob.dip - dt * 6);
      const nibbler = SHADOWS.find(s => s.mode === 'nibble');
      const interested = SHADOWS.some(s => s.mode === 'interested');
      if (nibbler) {
        G.nibbleT -= dt;
        if (G.nibbleT <= 0) {
          if (G.nibblesLeft > 0) {
            G.nibblesLeft--;
            G.bob.dip = 1;
            addRipple(G.bob.x, G.bob.y, 0.6);
            Sound.sfx.nibble();
            setPrompt('...a nibble... not yet...');
            G.nibbleT = rand(0.5, 1.0);
          } else {
            startBite(nibbler);
          }
        }
      } else if (!interested) {
        G.lureT -= dt;
        if (G.lureT <= 0) {
          G.lureT = 0.6;
          const near = SHADOWS.filter(s => s.mode === 'swim' && s.alpha > 0.6 && Math.hypot(s.x - G.bob.x, (s.y - G.bob.y) * 1.8) < 55);
          if (near.length && Math.random() < 0.3 / currentRod().wait) interest(near[0]);
        }
        if (G.t > 5 && !G.hinted) { G.hinted = true; setPrompt('Nothing close by... cast nearer to a shadow, or keep waiting.'); }
        if (G.t >= G.strayAt) startBite(null);
      }
      break;
    }
    case 'bite':
      if (Math.random() < dt * 8) splash(G.bob.x, G.bob.y, 1);
      if (G.t > RARITY[G.bite.rarity].biteWindow) {
        flee(G.hooked, G.bob.x, G.bob.y);
        G.hooked = null;
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
    case 'sailing':
      updateTravel(dt);
      break;
  }
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
  const steps = Math.max(12, Math.ceil(rx * 7));
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
  const loc = currentLoc();

  // --- sky and water gradients (recomputed a few times a second)
  gradientAge += 1;
  const key = pal.sky.join() + pal.water.join();
  if (key !== gradientKey && gradientAge > 8) {
    paintGradient(skyCanvas, pal.sky);
    paintGradient(waterCanvas, pal.water);
    gradientKey = key; gradientAge = 0;
  }
  g.drawImage(skyCanvas, 0, 0);

  drawSkyThings(g, pal, loc);

  // --- hills and the location's landmark
  g.fillStyle = pal.hillsFar;
  for (let x = 0; x < W; x++) g.fillRect(x, HORIZON - HILLS_FAR[x], 1, HILLS_FAR[x]);
  drawLandmark(g, pal, loc);

  // --- water
  g.drawImage(waterCanvas, 0, HORIZON);
  rect(g, 0, HORIZON, W, 1, rgba(pal.refl, 0.35));
  drawReflection(g, pal);
  drawWaves(g, 1);
  if (loc.props === 'ice') drawIceFloes(g, pal);

  // --- fish shadows under the water
  for (const s of SHADOWS) if (s.mode !== 'gone') drawShadow(g, s);

  // --- lily pads
  if (LILY_PADS[loc.id]) drawLilies(g, pal, LILY_PADS[loc.id]);

  // --- ripples
  for (const r of G.ripples) {
    const k = 1 - r.life;
    ring(g, r.x, r.y, 2 + k * 10 * r.s, 1 + k * 3 * r.s, `rgba(255,244,224,${(r.life * 0.6).toFixed(2)})`);
  }

  if (G.state === 'idle' && !openId && save.started) drawAim(g);
  if (['casting', 'waiting', 'bite', 'reeling', 'retract'].includes(G.state)) drawBobber(g);

  // --- foreground: dock or boat, angler, buddy (tinted as night falls)
  fgx.clearRect(0, 0, W, H);
  drawPlatform(fgx, pal, loc);
  if (pal.night > 0.01) {
    fgx.globalCompositeOperation = 'source-atop';
    fgx.fillStyle = rgba('#2a2060', pal.night * 0.42);
    fgx.fillRect(0, 0, W, H);
    fgx.globalCompositeOperation = 'source-over';
  }
  g.drawImage(fg, 0, 0);
  drawLampGlow(g, pal, loc);

  // --- fishing line
  if (!['idle', 'showing', 'sailing'].includes(G.state)) {
    const tip = rodTip();
    const end = G.state === 'landing' ? landingPos() : G.bob;
    const taut = G.state === 'reeling' || G.state === 'bite' || G.state === 'landing';
    const sag = taut ? 0 : 12;
    curve(g, tip.x, tip.y, (tip.x + end.x) / 2, Math.max(tip.y, end.y) + sag, end.x, end.y - 3, 'rgba(255,244,224,0.75)');
  }

  drawFrontProps(g, pal, loc);

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
  if (G.state === 'bite') drawExclaim(g, G.bob.x, G.bob.y - 16 - Math.abs(Math.sin(G.t * 14)) * 3);
  if (G.state === 'reeling') drawReel(g, pal);
  if (G.state === 'landing') drawLandingFish(g);
  if (G.state === 'sailing') drawSailing(g, pal);
}

function drawSkyThings(g, pal, loc) {
  // stars
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
  // aurora ribbons over the bay at night
  if (loc.landmark === 'icebergs' && pal.stars > 0.2) {
    const a = (pal.stars - 0.2) * 0.35;
    for (let x = 0; x < W; x += 2) {
      const y = 22 + Math.sin(x * 0.028 + G.time * 0.35) * 9 + Math.sin(x * 0.011 + 1) * 6;
      const h = 10 + Math.round(Math.sin(x * 0.07 + G.time) * 4);
      g.fillStyle = `rgba(120,255,200,${(a * (0.6 + 0.4 * Math.sin(x * 0.05 + G.time * 0.8))).toFixed(2)})`;
      g.fillRect(x, Math.round(y), 2, h);
      g.fillStyle = `rgba(200,140,255,${(a * 0.6).toFixed(2)})`;
      g.fillRect(x, Math.round(y) - 4, 2, 4);
    }
  }
  // moon
  if (pal.moon > 0.02) {
    g.globalAlpha = pal.moon;
    disc(g, 62, 26, 11, rgba('#efe6ff', 0.12));
    disc(g, 62, 26, 7, '#fff3dc');
    rect(g, 59, 23, 2, 2, '#e8dcc4'); rect(g, 64, 28, 3, 2, '#e8dcc4'); rect(g, 63, 22, 1, 1, '#e8dcc4');
    g.globalAlpha = 1;
  }
  // the sun, with retro stripes cut into its lower half
  const sunX = Math.round(pal.sunX), sunY = Math.round(pal.sunY), sunR = 15;
  if (sunY - sunR < HORIZON) {
    disc(g, sunX, sunY, sunR + 7, rgba(pal.sun, 0.14), HORIZON);
    disc(g, sunX, sunY, sunR + 3, rgba(pal.sun, 0.22), HORIZON);
    disc(g, sunX, sunY, sunR, pal.sun, HORIZON, dy => dy > 3 && (dy % 4 === 0 || (dy > 9 && dy % 4 === 1)));
  }
  // clouds (lit from below)
  for (const c of CLOUDS) {
    const x = Math.round(c.x), y = c.y, hw = Math.round(c.w / 2);
    ellipse(g, x, y + 1, hw, 2, pal.cloudShade);
    ellipse(g, x - Math.round(c.w / 6), y - 2, Math.round(c.w / 4), 3, pal.cloudShade);
    ellipse(g, x, y, hw, 2, pal.cloud);
    ellipse(g, x - Math.round(c.w / 6), y - 3, Math.round(c.w / 4), 3, pal.cloud);
    ellipse(g, x + Math.round(c.w / 7), y - 2, Math.round(c.w / 5), 2, pal.cloud);
  }
  // birds
  g.fillStyle = rgba('#3a2440', 0.8);
  for (const b of G.birds) {
    const up = Math.sin(G.time * 10 + b.p) > 0;
    const x = Math.round(b.x), y = Math.round(b.y + Math.sin(G.time * 2 + b.p) * 2);
    g.fillRect(x, y, 1, 1);
    g.fillRect(x - 1, up ? y - 1 : y, 1, 1); g.fillRect(x + 1, up ? y - 1 : y, 1, 1);
    g.fillRect(x - 2, up ? y - 2 : y, 1, 1); g.fillRect(x + 2, up ? y - 2 : y, 1, 1);
  }
}

function drawLandmark(g, pal, loc) {
  if (loc.landmark === 'volcano') return drawVolcano(g, pal);
  if (loc.landmark === 'floating') return drawFloatingIslands(g, pal);
  if (loc.landmark === 'icebergs') {
    const ice = lerpColor('#f4faff', pal.hills, 0.35 + pal.night * 0.3);
    const iceShade = lerpColor('#b0c8ec', pal.hills, 0.4 + pal.night * 0.3);
    for (let x = 0; x < W; x++) {
      const { h, shaded } = ICEBERGS[x];
      if (!h) continue;
      g.fillStyle = shaded ? iceShade : ice;
      g.fillRect(x, HORIZON - h, 1, h);
    }
    return;
  }
  if (loc.landmark === 'palms') {
    const sand = lerpColor('#f0c890', pal.hills, 0.35 + pal.night * 0.4);
    for (let x = 0; x < W; x++) {
      let h = HILLS_NEAR[x];
      if (x > 196) h = Math.max(0, Math.round(5 * Math.sin(Math.PI * clamp((x - 236) / 70, 0, 1))));
      if (!h) continue;
      g.fillStyle = x > 196 ? sand : pal.hills;
      g.fillRect(x, HORIZON - h, 1, h);
    }
    const trunk = lerpColor('#8a5a3a', pal.hills, 0.4), leaf = lerpColor('#4f9a5a', pal.hills, 0.45);
    for (const [px, ht, lean] of [[258, 20, 4], [276, 15, -3]]) {
      const base = HORIZON - 4;
      const top = { x: px + lean, y: base - ht };
      curve(g, px, base, px + lean * 0.2, base - ht * 0.6, top.x, top.y, trunk);
      const sway = Math.sin(G.time * 1.2 + px) * 0.8;
      for (const [dx, dy] of [[-9, 4], [-6, 6], [8, 4], [6, 7], [0, -4], [-3, 7]]) {
        curve(g, top.x, top.y, top.x + dx * 0.6, top.y - 3, top.x + dx + sway, top.y + dy, leaf);
      }
      rect(g, top.x - 1, top.y, 2, 2, lerpColor('#6a4a2a', pal.hills, 0.3));
    }
    return;
  }
  g.fillStyle = pal.hills;
  for (let x = 0; x < W; x++) if (HILLS_NEAR[x]) g.fillRect(x, HORIZON - HILLS_NEAR[x], 1, HILLS_NEAR[x]);
  if (loc.landmark === 'willow') drawWillow(g, pal);
  else if (loc.landmark === 'sakura') drawSakura(g, pal);
  else drawLighthouse(g, pal);
}

function drawSakura(g, pal) {
  const pink = lerpColor('#ffb0cc', pal.hills, 0.25 + pal.night * 0.45);
  const light = lerpColor('#ffdcea', pal.hills, 0.2 + pal.night * 0.45);
  const trunk = lerpColor('#5a3a3a', pal.hills, 0.4);
  const red = lerpColor('#e0404a', pal.hills, 0.3 + pal.night * 0.4);
  // a little shrine gate on the shore
  const tx = 224, tb = HORIZON - HILLS_NEAR[tx];
  rect(g, tx - 4, tb - 9, 1, 9, red); rect(g, tx + 4, tb - 9, 1, 9, red);
  rect(g, tx - 6, tb - 10, 13, 1, red); rect(g, tx - 5, tb - 8, 11, 1, red);
  for (const [x, size] of [[252, 1], [272, 1.3], [292, 0.9]]) {
    const base = HORIZON - HILLS_NEAR[x];
    const hgt = Math.round(9 * size);
    rect(g, x, base - hgt, 2, hgt, trunk);
    ellipse(g, x + 1, base - hgt - 2, Math.round(9 * size), Math.round(4 * size), pink);
    ellipse(g, x - 3, base - hgt - 4, Math.round(5 * size), Math.round(3 * size), light);
    ellipse(g, x + 5, base - hgt, Math.round(5 * size), Math.round(2 * size), pink);
  }
}

function drawVolcano(g, pal) {
  const cx = 250, top = HORIZON - 36;
  g.fillStyle = pal.hills;
  for (let x = 0; x < W; x++) {
    let h = x < 100 ? HILLS_NEAR[x] : 0;
    const v = 36 * (1 - Math.max(0, Math.abs(x - cx) - 5) / 58) + Math.sin(x * 0.9) * 0.6;
    h = Math.max(h, Math.round(v));
    if (h > 0) g.fillRect(x, HORIZON - h, 1, h);
  }
  // glowing crater and lava streaks, brighter as night falls
  const glow = 0.45 + pal.night * 0.55;
  g.fillStyle = `rgba(255,120,60,${glow.toFixed(2)})`;
  g.fillRect(cx - 5, top, 11, 2);
  for (const [dx, len] of [[-3, 9], [2, 14], [4, 6]]) {
    for (let i = 0; i < len; i++) g.fillRect(cx + dx + Math.round(i * (dx < 0 ? -0.35 : 0.3)), top + 2 + i, 1, 1);
  }
  disc(g, cx, top, 8, `rgba(255,140,80,${(0.12 * glow).toFixed(2)})`);
  // smoke rings drifting up
  for (let i = 0; i < 5; i++) {
    const k = ((G.time * 0.12 + i / 5) % 1);
    const r = Math.round(2 + k * 7);
    g.fillStyle = rgba(pal.cloudShade, (0.55 * (1 - k)).toFixed(2));
    ellipse(g, cx + Math.round(Math.sin(k * 4 + i) * 4 + k * 10), top - 4 - Math.round(k * 40), r, Math.max(1, Math.round(r * 0.6)), g.fillStyle);
  }
}

function drawFloatingIslands(g, pal) {
  g.fillStyle = pal.hills;
  for (let x = 0; x < 100; x++) if (HILLS_NEAR[x]) g.fillRect(x, HORIZON - HILLS_NEAR[x], 1, HILLS_NEAR[x]);
  const grass = lerpColor('#8ad07a', pal.hills, 0.3 + pal.night * 0.45);
  const rock = lerpColor('#a89ab8', pal.hills, 0.4 + pal.night * 0.4);
  for (const [x, y, r, p] of [[206, 42, 16, 0], [264, 26, 10, 2], [128, 56, 8, 4]]) {
    const yy = Math.round(y + Math.sin(G.time * 0.6 + p) * 2);
    for (let i = 0; i < r; i++) rect(g, x - r + i, yy + 1 + Math.round(i * 0.6), (r - i) * 2, 1, shade(rock, -i * 0.02));
    ellipse(g, x, yy, r, Math.max(1, Math.round(r / 4)), grass);
    rect(g, x - r + 2, yy, 1, 1, shade(grass, 0.3));
    // a thin waterfall off the edge
    g.fillStyle = 'rgba(240,248,255,0.55)';
    for (let i = 0; i < r * 1.6; i++) if ((i + Math.floor(G.time * 12)) % 4) g.fillRect(x + r - 3, yy + 1 + i, 1, 1);
    if (r > 12) { rect(g, x - 4, yy - 7, 1, 7, lerpColor('#6a4a3a', pal.hills, 0.3)); ellipse(g, x - 4, yy - 8, 4, 2, grass); }
  }
}

function drawWillow(g, pal) {
  const x = 272, base = HORIZON - HILLS_NEAR[x];
  const leaf = lerpColor('#8ac070', pal.hills, 0.45 + pal.night * 0.3);
  const leafDark = shade(leaf, -0.2);
  rect(g, x - 1, base - 12, 3, 12, lerpColor('#5a3a2a', pal.hills, 0.4));
  ellipse(g, x, base - 18, 15, 6, leaf);
  ellipse(g, x - 4, base - 21, 8, 4, shade(leaf, 0.1));
  for (let i = -15; i <= 15; i += 2) {
    const len = 8 + Math.round(Math.abs(Math.sin(i * 1.7)) * 7);
    const sway = Math.round(Math.sin(G.time * 1.1 + i * 0.3) * 1);
    g.fillStyle = i % 4 === 0 ? leafDark : leaf;
    g.fillRect(x + i + sway, base - 16, 1, len);
  }
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
  const layers = [{ x: pal.sunX, a: sunVis, col: pal.refl }, { x: 62, a: pal.moon * 0.8, col: '#efe6ff' }];
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

function drawWaves(g, speed) {
  for (const w of WAVES) {
    const x = ((w.x + G.time * (2 + w.d * 7) * w.dir * speed) % (W + 20) + W + 20) % (W + 20) - 10;
    const len = 2 + Math.round(w.d * 6);
    g.fillStyle = `rgba(255,240,230,${(0.1 + w.d * 0.16).toFixed(2)})`;
    g.fillRect(Math.round(x), w.y, len, 1);
  }
}

function drawIceFloes(g, pal) {
  const ice = lerpColor('#f4faff', pal.water[0], 0.25 + pal.night * 0.4);
  for (const [bx, y, r] of [[160, 118, 6], [250, 128, 9], [300, 112, 4], [205, 170, 7]]) {
    const x = ((bx + G.time * 1.5) % (W + 40) + W + 40) % (W + 40) - 20;
    ellipse(g, x, y + 1, r, Math.max(1, Math.round(r / 3)), shade(ice, -0.25));
    ellipse(g, x, y, r, Math.max(1, Math.round(r / 3)), ice);
  }
}

function drawLilies(g, pal, pads) {
  const padCol = lerpColor('#6aa860', '#22304a', pal.night * 0.8);
  pads.forEach(([x, y, r], i) => {
    ellipse(g, x, y, r, Math.max(1, Math.round(r / 3)), padCol);
    rect(g, x + 1, y - 1, 2, 1, shade(padCol, -0.25));
    if (i % 3 === 0) { rect(g, x - 2, y - 3, 2, 2, i % 2 ? '#fff4e0' : '#ff9ec4'); rect(g, x - 1, y - 4, 1, 1, '#fff3c4'); }
  });
}

function drawShadow(g, s) {
  const depth = (s.y - HORIZON) / (H - HORIZON);
  const sc = 0.55 + depth * 0.75;
  const wiggle = s.mode === 'flee' ? 0 : Math.round(Math.sin(s.t * 5) * 0.5);
  const rx = Math.max(2, Math.round((3 + s.size * 2.5) * sc)), ry = Math.max(1, Math.round(rx * 0.35));
  const col = `rgba(24,12,44,${(0.3 * clamp(s.alpha, 0, 1)).toFixed(2)})`;
  ellipse(g, s.x, s.y + wiggle, rx, ry, col);
  const tx = Math.round(s.x - s.dir * (rx + 1));
  g.fillRect(tx - (s.dir > 0 ? 1 : 0), Math.round(s.y) - 1 + wiggle, 2, 3);
  if (s.sp && s.sp.rarity === 'legendary' && s.alpha > 0.5 && Math.sin(s.t * 3) > 0.7) {
    rect(g, s.x + rand(-rx, rx), s.y - ry - 1, 1, 1, 'rgba(255,240,180,0.8)');
  }
}

function drawAim(g) {
  const x = Math.round(G.aim.x), y = Math.round(G.aim.y);
  const tip = rodTip();
  const far = (x - WATER.x0) / (WATER.x1 - WATER.x0);
  g.fillStyle = 'rgba(255,244,224,0.45)';
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const px = lerp(tip.x, x, t), py = lerp(tip.y, y, t) - Math.sin(Math.PI * t) * (28 + far * 30);
    if (i % 2 === 0) g.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  const a = 0.6 + Math.sin(G.time * 5) * 0.3;
  g.fillStyle = `rgba(255,244,224,${a.toFixed(2)})`;
  for (const [dx, dy] of [[-5, -2], [4, -2], [-5, 2], [4, 2]]) {
    g.fillRect(x + dx, y + dy, 2, 1);
    g.fillRect(x + (dx < 0 ? dx : dx + 1), y + (dy < 0 ? dy : dy - 1), 1, 2);
  }
  g.fillRect(x, y, 1, 1);
}

function drawBobber(g) {
  const b = G.bob;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
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

// --------------------------------------------------- dock, boat, people --
function drawPlatform(g, pal, loc) {
  if (loc.platform === 'boat') {
    const bx = 44, by = FEET_Y - 3 + G.platY;
    drawBoatBack(g, bx, by);
    drawLantern(g, bx + 5, by - 26, by - 1, pal);
    drawBucketProp(g, 56, 124 + G.platY);
    drawBuddy(g, 72);
    drawAnglerInScene(g);
    drawRod(g);
    drawBoatFront(g, bx, by, pal);
  } else {
    drawDock(g, pal);
    drawLantern(g, 20, 92, 126, pal);
    drawBucketProp(g, 40, 122);
    drawBuddy(g, 66);
    drawAnglerInScene(g);
    drawRod(g);
  }
}

function lampPos(loc) {
  return loc.platform === 'boat' ? { x: 50, y: FEET_Y - 25 + G.platY } : { x: 21, y: 96 };
}

function drawDock(g, pal) {
  const top = '#c07850', seam = '#8a4f3a', hi = '#e09a68', face = '#7a4432', post = '#5a3028';
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
  rect(g, 0, 137, 123, 4, face);
  rect(g, 0, 137, 123, 1, shade(face, 0.2));
  rect(g, 108, 118, 4, 8, post);
  rect(g, 107, 117, 6, 2, shade(post, 0.2));
  rect(g, 107, 121, 6, 1, '#e8d0a0');
}

function drawLantern(g, x, top, bottom, pal) {
  const post = '#5a3028';
  rect(g, x, top + 8, 2, bottom - top - 8, post);
  rect(g, x - 3, top, 8, 1, OUTLINE);
  rect(g, x - 2, top + 1, 6, 7, OUTLINE);
  rect(g, x - 1, top + 2, 4, 5, pal.lamp > 0.3 ? '#ffe08a' : '#6a4a60');
  rect(g, x, top - 1, 2, 1, OUTLINE);
}

// The far side of the boat, drawn behind the angler.
function drawBoatBack(g, bx, by) {
  rect(g, bx + 3, by - 5, 74, 2, '#6a3a2e');
  rect(g, bx + 3, by - 3, 74, 3, '#4a2a26');
}

// The near side of the hull, drawn in front so the angler stands *in* it.
function drawBoatFront(g, bx, by, pal) {
  const wood = '#a8603e', cream = '#fff4e0', red = '#e0566e', redDark = '#b83a55';
  // prow rising at the right
  for (let i = 0; i < 7; i++) rect(g, bx + 78 + i, by - 6 + i, 2, 8 - i, i < 2 ? wood : red);
  rect(g, bx, by, 80, 1, wood);
  rect(g, bx, by - 1, 80, 1, shade(wood, 0.25));
  rect(g, bx, by + 1, 80, 2, cream);
  for (let i = 0; i < 6; i++) {
    const inset = i < 3 ? 0 : (i - 2) * 3;
    rect(g, bx + inset + (i > 3 ? 1 : 0), by + 3 + i, 80 - inset * 2 + 4, 1, i > 3 ? redDark : red);
  }
  rect(g, bx + 10, by + 4, 3, 2, cream);
  rect(g, bx + 60, by + 4, 3, 2, cream);
  // waterline: the bottom of the hull is under water
  g.fillStyle = rgba(pal.water[0], 0.55);
  g.fillRect(bx - 2, by + 7, 90, 3);
  rect(g, bx - 4, by + 7 + Math.round(Math.sin(G.time * 2)), 94, 1, rgba(pal.refl, 0.4));
}

function drawLampGlow(g, pal, loc) {
  if (pal.lamp < 0.05) return;
  const { x, y } = lampPos(loc);
  const flick = 0.9 + Math.sin(G.time * 7) * 0.05 + Math.sin(G.time * 13) * 0.04;
  disc(g, x, y, 18, rgba('#ffd27a', 0.06 * pal.lamp * flick));
  disc(g, x, y, 11, rgba('#ffd27a', 0.09 * pal.lamp * flick));
  disc(g, x, y, 6, rgba('#fff0b0', 0.12 * pal.lamp * flick));
}

function drawBucketProp(g, x, y) {
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

function drawBuddy(g, cx) {
  if (save.look.buddy === 'none') return;
  const spr = buddySprite(save.look.buddy, G.buddyBlinking > 0);
  if (!spr) return;
  const hop = Math.floor(G.time * 1.6) % 2;
  const feet = FEET_Y + 2 + G.platY;
  ellipse(g, cx, feet, Math.round(spr.width / 2), 1, 'rgba(42,26,46,0.25)');
  g.drawImage(spr, cx - Math.round(spr.width / 2), feet - spr.height + hop);
}

function anglerFrame() {
  const speed = G.state === 'reeling' ? 6 : 2;
  return { bob: Math.floor(G.time * speed) % 2 === 1, blink: G.blinking > 0 };
}

function drawAnglerInScene(g) {
  const spr = anglerSprite(save.look, anglerFrame());
  const jump = G.cheer > 0 ? Math.round(Math.sin((G.cheer / 0.7) * Math.PI) * 5) : 0;
  const feet = FEET_Y + G.platY;
  ellipse(g, CHAR_X, feet + 1, 7, 1, 'rgba(42,26,46,0.28)');
  g.drawImage(spr, CHAR_X - ANGLER_W / 2, feet - ANGLER_FEET - jump);
}

function drawRod(g) {
  const rod = currentRod();
  const tip = rodTip();
  const h = hand();
  let bendX = 0, bendY = 0;
  if (G.state === 'reeling' || G.state === 'bite') { bendX = 4; bendY = 5; }
  const mx = (h.x + tip.x) / 2 + bendX, my = (h.y + tip.y) / 2 + bendY;
  curve(g, h.x, h.y + 3, mx, my, tip.x, tip.y, rod.color, 0.25);
  rect(g, h.x, h.y + 2, 2, 3, OUTLINE);
  rect(g, h.x - 1, h.y - 1, 2, 2, '#b8b0c0');
  if (rod.id === 'star' && Math.sin(G.time * 4) > 0.3) rect(g, tip.x - 1, tip.y - 1, 1, 1, '#fff3c4');
}

function drawFrontProps(g, pal, loc) {
  if (loc.props === 'reeds' || loc.props === 'lilies') {
    const reedCol = lerpColor('#4f7a48', '#1a2438', pal.night * 0.85);
    for (const r of REEDS) {
      const sway = Math.round(Math.sin(G.time * 1.3 + r.p) * 1.2);
      curve(g, r.x, H, r.x, H - r.h / 2, r.x + sway, H - r.h, reedCol);
      if (r.tail) rect(g, r.x + sway - 0.5, H - r.h - 3, 2, 4, lerpColor('#8a5030', '#2a2030', pal.night * 0.7));
    }
  }
  if (loc.props === 'coral') {
    const cols = ['#ff7a8a', '#ffa860', '#e070c0'].map(c => lerpColor(c, '#2a2050', pal.night * 0.6));
    const rock = lerpColor('#7a6a8a', '#1a1830', pal.night * 0.6);
    ellipse(g, 300, 178, 20, 4, rock);
    ellipse(g, 272, 180, 10, 3, rock);
    [[286, 16, 0], [296, 22, 1], [306, 14, 2], [314, 19, 0], [278, 11, 1]].forEach(([x, h, c]) => {
      const sway = Math.round(Math.sin(G.time * 0.9 + x) * 1);
      g.fillStyle = cols[c];
      g.fillRect(x, H - h, 2, h);
      g.fillRect(x - 3 + sway, H - h + 3, 3, 1); g.fillRect(x - 3 + sway, H - h, 1, 4);
      g.fillRect(x + 2, H - h + 6, 3, 1); g.fillRect(x + 4 + sway, H - h + 2, 1, 5);
      g.fillStyle = shade(cols[c], 0.3);
      g.fillRect(x, H - h, 1, 1);
    });
  }
  if (loc.props === 'petals') {
    for (const f of SNOW) {
      const y = (f.y + G.time * f.v * 0.7) % H;
      const x = ((f.x + G.time * 9 + Math.sin(G.time + f.p) * 5) % W + W) % W;
      g.fillStyle = f.p > 3 ? 'rgba(255,196,220,0.9)' : 'rgba(255,230,240,0.9)';
      g.fillRect(Math.round(x), Math.round(y), f.p > 4.5 ? 2 : 1, 1);
    }
  }
  if (loc.props === 'embers') {
    for (const f of SNOW) {
      const y = H - ((f.y + G.time * f.v * 1.2) % H);
      const x = (f.x + Math.sin(G.time * 1.5 + f.p) * 3 + W) % W;
      const a = 0.5 + 0.5 * Math.sin(G.time * 6 + f.p * 3);
      g.fillStyle = `rgba(255,${f.p > 3 ? 180 : 120},60,${a.toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  if (loc.props === 'mist') {
    for (let i = 0; i < 5; i++) {
      const y = HORIZON + 6 + i * 15;
      const x = ((i * 90 + G.time * (4 + i)) % (W + 120)) - 100;
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.fillRect(Math.round(x), y, 100, 3);
      g.fillRect(Math.round(x) + 10, y - 1, 70, 1);
    }
  }
  if (loc.props === 'ice') {
    for (const f of SNOW) {
      const y = (f.y + G.time * f.v) % H;
      const x = (f.x + Math.sin(G.time * 0.8 + f.p) * 4 + W) % W;
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  if (pal.night > 0.3 && !['ice', 'embers', 'mist'].includes(loc.props)) {
    for (const f of FIREFLIES) {
      const a = (pal.night - 0.3) * (0.5 + 0.5 * Math.sin(G.time * 3 + f.p));
      const x = f.x + Math.sin(G.time * f.a + f.p) * 12, y = f.y + Math.cos(G.time * f.b + f.p) * 6;
      g.fillStyle = `rgba(255,230,120,${(a * 0.25).toFixed(2)})`;
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      g.fillStyle = `rgba(255,240,160,${a.toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}

// ------------------------------------------------------------ in-scene UI --
function drawExclaim(g, x, y, col = '#fff4e0') {
  x = Math.round(x); y = Math.round(y);
  rect(g, x - 2, y - 1, 5, 11, OUTLINE);
  rect(g, x - 1, y, 3, 6, col);
  rect(g, x - 1, y + 7, 3, 2, col);
  rect(g, x - 1, y, 1, 6, col === '#fff4e0' ? '#ffd27a' : shade(col, 0.3));
}

const miniFishCache = new Map();
function miniFish(sp, tint = null) {
  const key = sp.id + (tint || '');
  if (!miniFishCache.has(key)) {
    const body = tint || sp.body || '#8a5a3a', fin = tint ? shade(tint, -0.2) : (sp.fin || '#6a4a3a');
    miniFishCache.set(key, addOutline(mapCanvas(['t.bbb.', 'tbbbeb', 't.bbb.'], { t: fin, b: body, e: OUTLINE })));
  }
  return miniFishCache.get(key);
}

// The chase panel: a peek under the water with the fish and your net.
function drawReel(g, pal) {
  const r = G.reel;
  const { x: px, y: py, w: pw, h: ph } = RP;
  rect(g, px - 3, py - 3, pw + 6, ph + 6, OUTLINE);
  rect(g, px - 2, py - 2, pw + 4, ph + 4, r.inNet ? '#ffd27a' : '#fff4e0');
  rect(g, px - 1, py - 1, pw + 2, ph + 2, OUTLINE);
  g.save();
  g.beginPath(); g.rect(px, py, pw, ph); g.clip();

  const top = lerpColor(pal.water[0], '#bfe8f0', 0.2), bot = pal.water[3];
  for (let y = 0; y < ph; y += 3) rect(g, px, py + y, pw, 3, lerpColor(top, bot, y / ph));
  g.fillStyle = 'rgba(255,244,224,0.06)';
  for (let i = 0; i < 5; i++) {
    const x0 = px + ((i * 62 + G.time * 7) % (pw + 70)) - 40;
    for (let y = 0; y < ph; y += 2) g.fillRect(Math.round(x0 + y * 0.45), py + y, 9, 2);
  }
  const sand = lerpColor('#e8c090', bot, 0.35);
  rect(g, px, py + ph - 7, pw, 7, sand);
  for (let x = 3; x < pw; x += 11) rect(g, px + x, py + ph - 5 + (x % 3), 2, 1, shade(sand, -0.15));
  const weed = lerpColor('#5aa860', bot, 0.3);
  for (const [wx, wh] of [[12, 26], [20, 18], [70, 30], [132, 22], [190, 34], [198, 20], [236, 26]]) {
    const sway = Math.sin(G.time * 1.4 + wx) * 3;
    curve(g, px + wx, py + ph - 6, px + wx - sway, py + ph - 6 - wh / 2, px + wx + sway, py + ph - 6 - wh, weed);
    curve(g, px + wx + 1, py + ph - 6, px + wx + 1 - sway, py + ph - 6 - wh / 2, px + wx + 1 + sway, py + ph - 6 - wh, weed);
  }
  for (const b of r.bubbles) {
    rect(g, px + b.x + Math.sin(b.y * 0.2) * 1.5, py + b.y, 2, 2, 'rgba(255,255,255,0.45)');
  }

  // the net
  const nx = Math.round(px + r.nx), ny = Math.round(py + r.ny);
  if (r.inNet) disc(g, nx, ny, r.net, 'rgba(255,210,122,0.2)');
  ring(g, nx, ny, r.net, r.net, r.inNet ? '#ffd27a' : 'rgba(255,244,224,0.9)');
  ring(g, nx, ny, r.net - 1, r.net - 1, r.inNet ? 'rgba(255,210,122,0.5)' : 'rgba(255,244,224,0.3)');
  rect(g, nx - 2, ny, 5, 1, 'rgba(255,244,224,0.6)');
  rect(g, nx, ny - 2, 1, 5, 'rgba(255,244,224,0.6)');

  // the fish (sprites face right; flip when it swims left)
  const spr = fishSprite(r.sp);
  const fx = Math.round(px + r.fx), fy = Math.round(py + r.fy + Math.sin(G.time * 10) * 0.6);
  g.save();
  g.translate(fx, fy);
  if (r.dir < 0) g.scale(-1, 1);
  g.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
  g.restore();
  g.restore();

  // catch bar under the panel
  const by = py + ph + 4, p = clamp(r.progress, 0, 1);
  rect(g, px - 1, by - 1, pw + 2, 7, OUTLINE);
  rect(g, px, by, pw, 5, '#3a2a4a');
  const col = p < 0.5 ? lerpColor('#e0566e', '#ffd27a', p * 2) : lerpColor('#ffd27a', '#8fd19e', (p - 0.5) * 2);
  rect(g, px, by, Math.round(pw * p), 5, col);
  rect(g, px, by, Math.round(pw * p), 1, shade(col, 0.4));
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

// The trip between spots: fade out, sail across open water, fade in.
function drawSailing(g, pal) {
  const t = G.travel.t;
  let cover;
  if (t < 0.5) cover = t / 0.5;
  else if (t < 0.8) cover = 1 - (t - 0.5) / 0.3;
  else if (t < 2.5) cover = 0;
  else if (t < 2.8) cover = (t - 2.5) / 0.3;
  else cover = 1 - (t - 2.8) / 0.5;

  if (t >= 0.5 && t < 2.8) {
    g.drawImage(skyCanvas, 0, 0);
    drawSkyThings(g, pal, { landmark: '' });
    g.fillStyle = pal.hillsFar;
    for (let x = 0; x < W; x++) {
      const h = HILLS_FAR[(x + Math.floor(t * 20)) % W];
      g.fillRect(x, HORIZON - h, 1, h);
    }
    g.drawImage(waterCanvas, 0, HORIZON);
    rect(g, 0, HORIZON, W, 1, rgba(pal.refl, 0.35));
    drawReflection(g, pal);
    drawWaves(g, -6);
    const k = (t - 0.5) / 2.3;
    const bx = Math.round(lerp(-60, W + 10, k)), by = 138 + Math.round(Math.sin(G.time * 3) * 1.2);
    for (let i = 0; i < 6; i++) rect(g, bx - 4 - i * 6, by + 8 + (i % 2), 4 - (i > 3 ? 2 : 0), 1, 'rgba(255,244,224,0.5)');
    drawBoatBack(g, bx, by);
    // a little sail for the voyage
    rect(g, bx + 40, by - 40, 2, 38, '#6a3a2e');
    for (let i = 0; i < 26; i++) rect(g, bx + 42, by - 38 + i, Math.round(i * 0.8), 1, i % 6 === 0 ? '#ffd27a' : '#fff4e0');
    const spr = anglerSprite(save.look, anglerFrame());
    g.drawImage(spr, bx + 22 - ANGLER_W / 2, by + 3 - ANGLER_FEET);
    if (save.look.buddy !== 'none') {
      const b = buddySprite(save.look.buddy, G.buddyBlinking > 0);
      g.drawImage(b, bx + 58, by + 4 - b.height);
    }
    drawBoatFront(g, bx, by, pal);
  }
  if (cover > 0) {
    g.fillStyle = `rgba(42,26,46,${clamp(cover, 0, 1).toFixed(2)})`;
    g.fillRect(0, 0, W, H);
  }
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
