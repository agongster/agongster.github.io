// ─────────────────────────────────────────────
//  Crossy Road  –  game.js  (voxel 3D / Three.js)
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');

const LANE = { GRASS: 'grass', ROAD: 'road', WATER: 'water', RAIL: 'rail' };

const COLS = 21;                    // playable columns
const COL0 = -Math.floor(COLS / 2); // left-most column index
const COL1 = COL0 + COLS - 1;       // right-most column index
const TILE = 1;
const EDGE_BUFFER = 16;             // extra visual-only ground tiles beyond the playable width, so the world edge never shows on screen
const WORLD_COLS = COLS + EDGE_BUFFER * 2;

const PALETTE = {
  grassA: 0x9dbb52, grassB: 0x86a83f,
  dirtA:  0xdcc27a, dirtB:  0xcfb56c,
  roadA:  0x4c4049, roadB:  0x41363f,
  curb:   0xe8e2d6,
  line:   0xf2e9d8,
  waterA: 0x4fc3e0, waterB: 0x3fa9c9,
  foam:   0xdff6ff,
  log:    0x8a5a34, logEnd: 0x6b4423,
  railBed:0x8d7d78, tie: 0x5c4632, rail: 0xd9c9b9,
  trunk:  0x6d4c28, leaf: 0x7ea83f, leafDark: 0x648f30,
  rock:   0xab9a92,
  trainWarn: 0xff3b30,
  cars: [0xe75c4c, 0x4fa8b0, 0xf1c40f, 0x9b59b6, 0xe0a83d, 0xe67e22, 0xff7ac6],
  trucks: [0x4a3d45, 0x5d4037, 0x4d5a24, 0x5a4a52],
  trains: [0x5a4a52, 0xc62828, 0x6a3b6e],
};

// ─────────────────────────────────────────────
//  Three.js core
// ─────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = 0xff9f68;
scene.background = new THREE.Color(SKY);
const CAM_DIST = 16;
// Slight tilt off true top-down (0 = straight overhead) — kept small and with no
// left-right (x) component so the view stays strictly north-south, just angled
// enough to read box side-faces a little, per reference.
const CAM_TILT = 20 * Math.PI / 180;
const CAM_DIR = new THREE.Vector3(0, Math.cos(CAM_TILT), Math.sin(CAM_TILT));
scene.fog = new THREE.Fog(SKY, CAM_DIST + 2, CAM_DIST + 28);

let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 80);
const LOOK_AHEAD = 3;

const hemi = new THREE.HemisphereLight(0xffd9a8, 0x6a4f6a, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb066, 1.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0015;
scene.add(sun);
scene.add(sun.target);

function onResize() {
  aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

// ─────────────────────────────────────────────
//  Voxel helpers
// ─────────────────────────────────────────────

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();
function mat(color) {
  const key = color;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color }));
  }
  return matCache.get(key);
}

// Adds a box mesh (unit cube scaled) to `parent`, centered at (x,y,z), size (w,h,d).
function box(parent, w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(unitBox, mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (opts && opts.emissive) {
    m.material = m.material.clone();
    m.material.emissive = new THREE.Color(opts.emissive);
    m.material.emissiveIntensity = opts.emissiveIntensity || 1;
  }
  parent.add(m);
  return m;
}

function group(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

function tint(hex, amt) {
  const c = new THREE.Color(hex);
  const h = {}; c.getHSL(h);
  c.setHSL(h.h, h.s, Math.max(0, Math.min(1, h.l + amt)));
  return c.getHex();
}

function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

// ─────────────────────────────────────────────
//  Voxel model builders
// ─────────────────────────────────────────────

function buildTree(rng) {
  const g = new THREE.Group();
  const trunkH = rand(0.35, 0.5);
  box(g, 0.34, trunkH, 0.34, PALETTE.trunk, 0, trunkH / 2, 0);
  const leafColor = (rng ? rng() : Math.random()) < 0.5 ? PALETTE.leaf : PALETTE.leafDark;
  const s1 = rand(0.85, 1.0);
  box(g, s1, s1, s1, leafColor, 0, trunkH + s1 / 2 - 0.05, 0);
  const s2 = s1 * 0.68;
  box(g, s2, s2, s2, tint(leafColor, 0.05), 0, trunkH + s1 - 0.05 + s2 / 2 - 0.03, 0);
  return g;
}

function buildBush() {
  const g = new THREE.Group();
  const c = Math.random() < 0.5 ? PALETTE.leaf : PALETTE.leafDark;
  box(g, 0.7, 0.34, 0.7, c, 0, 0.17, 0);
  box(g, 0.42, 0.22, 0.42, tint(c, 0.06), 0.05, 0.34 + 0.06, -0.02);
  return g;
}

function buildRock() {
  const g = new THREE.Group();
  box(g, 0.5, 0.32, 0.44, PALETTE.rock, 0, 0.16, 0);
  box(g, 0.26, 0.18, 0.22, tint(PALETTE.rock, 0.08), 0.1, 0.32, 0.05);
  return g;
}

function buildCar(color, isTruck) {
  const g = new THREE.Group();
  if (!isTruck) {
    box(g, 1.0, 0.32, 0.62, color, 0, 0.24, 0);
    box(g, 0.5, 0.26, 0.56, tint(color, -0.08), -0.05, 0.5, 0);
    box(g, 0.42, 0.14, 0.48, 0xcfefff, -0.05, 0.5, 0); // windows
    // headlights / taillights
    box(g, 0.06, 0.1, 0.5, 0xfff6c9, 0.5, 0.28, 0);
    box(g, 0.06, 0.1, 0.5, 0xd32f2f, -0.5, 0.28, 0);
    // wheels
    wheelSet(g, 0.32, 0.08, 0.34);
  } else {
    box(g, 0.62, 0.42, 0.66, tint(color, 0.12), 0.14, 0.30, 0); // cargo box
    box(g, 0.36, 0.34, 0.6, color, -0.34, 0.26, 0); // cab
    box(g, 0.3, 0.2, 0.54, 0xcfefff, -0.34, 0.42, 0); // windshield tint
    box(g, 0.06, 0.1, 0.56, 0xfff6c9, -0.52, 0.24, 0);
    wheelSet(g, 0.48, 0.09, 0.36, true);
  }
  return g;
}

function wheelSet(g, hx, y, hz, extra) {
  const positions = extra
    ? [[hx, y, hz], [hx, y, -hz], [-hx, y, hz], [-hx, y, -hz], [hx * 0.15, y, hz], [hx * 0.15, y, -hz]]
    : [[hx, y, hz], [hx, y, -hz], [-hx, y, hz], [-hx, y, -hz]];
  for (const [x, , z] of positions) box(g, 0.16, 0.16, 0.12, 0x1b1b1b, x, y, z);
}

function buildTrain(color) {
  const g = new THREE.Group();
  box(g, 3.2, 0.9, 0.92, color, 0, 0.55, 0);
  box(g, 0.9, 0.4, 0.98, tint(color, 0.15), 1.6, 1.1, 0);
  box(g, 0.06, 0.3, 0.9, 0xcfefff, 1.6, 1.1, 0);
  for (let i = -1; i <= 1; i++) box(g, 0.05, 0.3, 0.96, 0xcfefff, i * 0.9, 0.55, 0);
  for (let i = -1; i <= 1; i++) box(g, 0.35, 0.1, 1.0, 0x1b1b1b, i * 0.9, 0.12, 0);
  return g;
}

function buildLog(len) {
  const g = new THREE.Group();
  box(g, len, 0.32, 0.82, PALETTE.log, 0, 0.16, 0);
  box(g, 0.14, 0.34, 0.86, PALETTE.logEnd, len / 2 - 0.07, 0.16, 0);
  box(g, 0.14, 0.34, 0.86, PALETTE.logEnd, -len / 2 + 0.07, 0.16, 0);
  return g;
}

function buildChicken() {
  const g = new THREE.Group();
  const body = box(g, 0.5, 0.4, 0.56, 0xfbf3e6, 0, 0.34, 0);
  const head = box(g, 0.34, 0.32, 0.34, 0xfbf3e6, 0, 0.62, -0.2);
  box(g, 0.1, 0.1, 0.16, 0xff7a3d, 0, 0.6, -0.4); // beak
  box(g, 0.16, 0.14, 0.1, 0xe53935, 0, 0.82, -0.2); // comb
  box(g, 0.04, 0.04, 0.04, 0x1a1a1a, -0.1, 0.66, -0.36); // eye L
  box(g, 0.04, 0.04, 0.04, 0x1a1a1a, 0.1, 0.66, -0.36); // eye R
  const wingL = box(g, 0.1, 0.24, 0.3, tint(0xfbf3e6, -0.08), -0.3, 0.34, 0);
  const wingR = box(g, 0.1, 0.24, 0.3, tint(0xfbf3e6, -0.08), 0.3, 0.34, 0);
  const legL = box(g, 0.08, 0.16, 0.08, 0xff7a3d, -0.14, 0.08, 0);
  const legR = box(g, 0.08, 0.16, 0.08, 0xff7a3d, 0.14, 0.08, 0);
  g.userData = { body, head, wingL, wingR, legL, legR };
  return g;
}

// ─────────────────────────────────────────────
//  Lane data generation
// ─────────────────────────────────────────────

function makeGrassLane(row) {
  const rng = seededRng(row * 7919 + 13);
  const obstacles = new Map(); // col -> 'tree' | 'bush' | 'rock' (all block movement)
  const decor = [];
  const safeCols = new Set();
  // never block every column: leave a guaranteed clear path density
  for (let c = COL0; c <= COL1; c++) {
    const r = rng();
    if (r < 0.16) obstacles.set(c, 'tree');
    else if (r < 0.2) obstacles.set(c, 'rock');
    else if (r < 0.30) obstacles.set(c, 'bush');
  }
  return { type: LANE.GRASS, row, obstacles, decor };
}

function makeRoadLane(row, difficulty) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  // Both speed and vehicle count scale directly (not just via random range) with
  // difficulty, so hard mode reads as clearly faster and more crowded, not just
  // a wider random spread.
  const speed = Math.min(11, 1.8 + difficulty * 1.0 + Math.random() * 1.3);
  const isTruck = Math.random() < 0.28;
  const count = Math.min(9, 2 + Math.floor(difficulty * 1.3 + Math.random() * 2));
  const spacing = COLS / count;
  const vehicles = [];
  for (let i = 0; i < count; i++) {
    const len = isTruck ? 1.7 : rand(1.0, 1.5);
    vehicles.push({
      x: COL0 + i * spacing + Math.random() * spacing * 0.4,
      len,
      isTruck,
      color: isTruck ? pick(PALETTE.trucks) : pick(PALETTE.cars),
    });
  }
  return { type: LANE.ROAD, row, dir, speed, vehicles };
}

function makeWaterLane(row, difficulty, forcedSpeed) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const speed = forcedSpeed !== undefined ? forcedSpeed : (1.1 + Math.random() * difficulty * 0.8);
  const count = 3 + Math.floor(Math.random() * 2);
  const spacing = COLS / count;
  const logs = [];
  for (let i = 0; i < count; i++) {
    const len = rand(2.2, 3.4);
    logs.push({ x: COL0 + i * spacing + Math.random() * spacing * 0.25, len });
  }
  return { type: LANE.WATER, row, dir, speed, logs };
}

function makeRailLane(row) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    type: LANE.RAIL, row, dir,
    state: 'idle',
    timer: rand(1500, 4000),
    trainSpeed: rand(9, 12),
    trainColor: pick(PALETTE.trains),
  };
}

function generateLanes(startRow, count, difficulty) {
  const lanes = [];
  let consRoad = 0, consWater = 0, consRail = 0;
  let waterBlockSpeed = null;
  for (let i = 0; i < count; i++) {
    const row = startRow + i;
    if (i % 9 === 0) { lanes.push(makeGrassLane(row)); consRoad = consWater = consRail = 0; waterBlockSpeed = null; continue; }
    const r = Math.random();
    let type;
    if (consRoad >= 3 || consWater >= 3 || consRail >= 1) type = LANE.GRASS;
    else if (r < 0.42) type = LANE.ROAD;
    else if (r < 0.68) type = LANE.WATER;
    else if (r < 0.8) type = LANE.RAIL;
    else type = LANE.GRASS;

    if (type === LANE.ROAD) { lanes.push(makeRoadLane(row, difficulty)); consRoad++; consWater = consRail = 0; waterBlockSpeed = null; }
    else if (type === LANE.WATER) {
      // Lanes within the same consecutive water run share one speed magnitude so their
      // relative log phase stays fixed and realigns on a short, predictable period —
      // otherwise independent random speeds could take arbitrarily long to line up.
      if (consWater === 0) waterBlockSpeed = 1.1 + Math.random() * difficulty * 0.8;
      lanes.push(makeWaterLane(row, difficulty, waterBlockSpeed));
      consWater++; consRoad = consRail = 0;
    }
    else if (type === LANE.RAIL) { lanes.push(makeRailLane(row)); consRail++; consRoad = consWater = 0; waterBlockSpeed = null; }
    else { lanes.push(makeGrassLane(row)); consRoad = consWater = consRail = 0; waterBlockSpeed = null; }
  }
  return lanes;
}

// ─────────────────────────────────────────────
//  Lane → scene group
// ─────────────────────────────────────────────

function buildLaneGroup(lane) {
  const g = new THREE.Group();
  g.position.set(0, 0, -lane.row * TILE);

  if (lane.type === LANE.GRASS) {
    for (let c = COL0 - EDGE_BUFFER; c <= COL1 + EDGE_BUFFER; c++) {
      const base = (c + lane.row) % 2 === 0 ? PALETTE.grassA : PALETTE.grassB;
      box(g, 1, 0.5, 1, base, c, -0.25, 0);
    }
    for (const [col, kind] of lane.obstacles) {
      const model = kind === 'tree' ? buildTree() : kind === 'rock' ? buildRock() : buildBush();
      model.position.set(col, 0, 0);
      g.add(model);
    }
    for (const d of lane.decor) {
      const model = buildBush();
      model.position.set(d.col, 0, 0);
      g.add(model);
    }
  }

  if (lane.type === LANE.ROAD) {
    for (let c = COL0 - EDGE_BUFFER; c <= COL1 + EDGE_BUFFER; c++) {
      box(g, 1, 0.44, 1, (c + lane.row) % 2 === 0 ? PALETTE.roadA : PALETTE.roadB, c, -0.22, 0);
    }
    box(g, WORLD_COLS, 0.02, 0.08, PALETTE.line, 0, 0.011, 0);
    lane.vehicleMeshes = [];
    for (const v of lane.vehicles) {
      const m = buildCar(v.color, v.isTruck);
      m.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      m.position.set(v.x, 0, 0);
      g.add(m);
      lane.vehicleMeshes.push(m);
    }
  }

  if (lane.type === LANE.WATER) {
    for (let c = COL0 - EDGE_BUFFER; c <= COL1 + EDGE_BUFFER; c++) {
      box(g, 1, 0.4, 1, (c + lane.row) % 2 === 0 ? PALETTE.waterA : PALETTE.waterB, c, -0.32, 0);
    }
    lane.logMeshes = [];
    for (const lg of lane.logs) {
      const m = buildLog(lg.len);
      m.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      m.position.set(lg.x, -0.02, 0);
      g.add(m);
      lane.logMeshes.push(m);
    }
  }

  if (lane.type === LANE.RAIL) {
    for (let c = COL0 - EDGE_BUFFER; c <= COL1 + EDGE_BUFFER; c++) {
      box(g, 1, 0.34, 1, PALETTE.railBed, c, -0.3, 0);
      if (c % 1 === 0) box(g, 0.16, 0.06, 0.86, PALETTE.tie, c, -0.09, 0);
    }
    box(g, WORLD_COLS, 0.05, 0.05, PALETTE.rail, 0, -0.05, 0.22);
    box(g, WORLD_COLS, 0.05, 0.05, PALETTE.rail, 0, -0.05, -0.22);
    const lightL = box(g, 0.12, 0.5, 0.12, 0x333333, COL0 - 0.3, 0.15, 0);
    const lightR = box(g, 0.12, 0.5, 0.12, 0x333333, COL1 + 0.3, 0.15, 0);
    const lampL = box(g, 0.16, 0.16, 0.16, PALETTE.trainWarn, COL0 - 0.3, 0.42, 0);
    const lampR = box(g, 0.16, 0.16, 0.16, PALETTE.trainWarn, COL1 + 0.3, 0.42, 0);
    lampL.material = lampL.material.clone();
    lampR.material = lampR.material.clone();
    lane.lamps = [lampL, lampR];
    lane.trainMesh = null;
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ─────────────────────────────────────────────
//  World
// ─────────────────────────────────────────────

let world, player, score, best, gameState, camState;
let moveQueue = [];
const particles = [];

function initWorld() {
  const preset = DIFFICULTY_PRESETS[difficultyKey];
  const lanes = [makeGrassLane(0), makeGrassLane(-1), makeGrassLane(-2)];
  lanes[0].obstacles.clear();
  lanes.push(...generateLanes(1, 60, preset.base));
  const byRow = new Map();
  for (const l of lanes) byRow.set(l.row, l);
  return { lanes, byRow, topGenerated: 60, activeRows: new Set() };
}

function extendWorld() {
  const preset = DIFFICULTY_PRESETS[difficultyKey];
  const top = world.topGenerated + 1;
  const diff = Math.min(preset.base + score * preset.growth, preset.max);
  const more = generateLanes(top, 40, diff);
  world.lanes.push(...more);
  for (const l of more) world.byRow.set(l.row, l);
  world.topGenerated = top + 39;
}

function clearWorldFromScene() {
  for (const l of world.lanes) if (l.sceneGroup) scene.remove(l.sceneGroup);
  world.activeRows.clear();
}

const VIEW_BEHIND = 4, VIEW_AHEAD = 16;

function updateVisibleLanes() {
  const lo = player.row - VIEW_BEHIND, hi = player.row + VIEW_AHEAD;
  for (const row of Array.from(world.activeRows)) {
    if (row < lo || row > hi) {
      const l = world.byRow.get(row);
      if (l && l.sceneGroup) scene.remove(l.sceneGroup);
      world.activeRows.delete(row);
    }
  }
  for (let r = lo; r <= hi; r++) {
    if (world.activeRows.has(r)) continue;
    const l = world.byRow.get(r);
    if (!l) continue;
    if (!l.sceneGroup) l.sceneGroup = buildLaneGroup(l);
    scene.add(l.sceneGroup);
    world.activeRows.add(r);
  }
}

// ─────────────────────────────────────────────
//  Player
// ─────────────────────────────────────────────

const FACE_ANGLE = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

function initPlayer() {
  const model = buildChicken();
  scene.add(model);
  return {
    row: 0, col: 0, x: 0, z: 0,
    model,
    animT: 0, animFrom: null, animTo: null, hopping: false,
    facing: 'up',
    dead: false, deathAnim: 0, deathCause: '',
    onLog: null,
  };
}

function resetPlayer() {
  player.row = 0; player.col = 0; player.x = 0; player.z = 0;
  player.animFrom = null; player.hopping = false;
  player.facing = 'up';
  player.dead = false; player.deathAnim = 0;
  player.onLog = null;
  player.model.visible = true;
  player.model.scale.set(1, 1, 1);
  player.model.rotation.set(0, 0, 0);
  player.model.position.set(0, 0, 0);
}

// ─────────────────────────────────────────────
//  DOM / lifecycle
// ─────────────────────────────────────────────

const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const pauseScreen = document.getElementById('pause-screen');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const deathFlashEl = document.getElementById('death-flash');

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', showStartScreen);
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('pause-restart-btn').addEventListener('click', startGame);

// ─────────────────────────────────────────────
//  Difficulty
// ─────────────────────────────────────────────

const DIFFICULTY_PRESETS = {
  easy:   { base: 0.4, growth: 0.02,  max: 2.2 },
  normal: { base: 1.0, growth: 0.045, max: 5.0 },
  hard:   { base: 2.0, growth: 0.065, max: 6.5 },
};
let difficultyKey = localStorage.getItem('crossy_difficulty') || 'normal';
if (!DIFFICULTY_PRESETS[difficultyKey]) difficultyKey = 'normal';

const diffBtns = document.querySelectorAll('.diff-btn');
function setDifficulty(key) {
  difficultyKey = key;
  localStorage.setItem('crossy_difficulty', key);
  diffBtns.forEach(b => b.classList.toggle('active', b.dataset.diff === key));
}
diffBtns.forEach(btn => btn.addEventListener('click', () => setDifficulty(btn.dataset.diff)));
setDifficulty(difficultyKey);

function startGame() {
  if (world) clearWorldFromScene();
  world = initWorld();
  if (!player) player = initPlayer();
  resetPlayer();
  updateVisibleLanes();

  score = 0;
  best = parseInt(localStorage.getItem('crossy_best') || '0');
  moveQueue = [];
  gameState = 'playing';
  camState = { x: 0, z: 0, targetZ: 0, shake: 0, shakeT: 0 };
  deathFlashEl.style.transition = 'none';
  deathFlashEl.style.opacity = '0';

  scoreEl.textContent = 0;
  bestEl.textContent = best;
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
}

function showGameOver() {
  if (score > best) { best = score; localStorage.setItem('crossy_best', best); }
  finalScoreEl.textContent = score;
  finalBestEl.textContent = best;
  hud.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');
  gameState = 'gameover';
}

function showStartScreen() {
  gameState = 'start';
  gameoverScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.add('hidden');
  startScreen.classList.remove('hidden');
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  for (const k in keysDown) keysDown[k] = false; // avoid a held key being "stuck" across the pause
  hud.classList.add('hidden');
  pauseScreen.classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
}

// ─────────────────────────────────────────────
//  Input
// ─────────────────────────────────────────────

const KEY_MAP = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};
const keysDown = {};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (gameState === 'playing') { e.preventDefault(); pauseGame(); }
    else if (gameState === 'paused') { e.preventDefault(); resumeGame(); }
    return;
  }
  const dir = KEY_MAP[e.key];
  if (dir && gameState === 'playing') {
    e.preventDefault();
    if (!keysDown[dir]) { keysDown[dir] = true; if (moveQueue.length < 2) moveQueue.push(dir); }
  }
});
document.addEventListener('keyup', e => { const dir = KEY_MAP[e.key]; if (dir) keysDown[dir] = false; });

let touchStart = null;
canvas.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', e => {
  if (!touchStart || gameState !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
  if (moveQueue.length < 2) {
    moveQueue.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }
  e.preventDefault();
}, { passive: false });

// ─────────────────────────────────────────────
//  Movement / physics
// ─────────────────────────────────────────────

const MOVE_DUR = 130;
const DEATH_DUR = 950;
const DEATH_FREEZE = 90; // brief hit-stop before the tumble plays, to sell the impact

function tryMove(dir) {
  // Base the new column on the chicken's actual current position, not the stale
  // grid column from the last landing — a log drifts player.x continuously while
  // player.col stays fixed, so using player.col here would snap back to wherever
  // the chicken originally boarded the log instead of where it drifted to.
  let r = player.row, c = Math.round(player.x);
  if (dir === 'up') { r++; player.facing = 'up'; }
  if (dir === 'down') { r--; player.facing = 'down'; }
  if (dir === 'left') { c--; player.facing = 'left'; }
  if (dir === 'right') { c++; player.facing = 'right'; }

  if (c < COL0 + 1 || c > COL1 - 1) { player.model.rotation.y = FACE_ANGLE[player.facing]; return; }
  if (r < -2) { player.model.rotation.y = FACE_ANGLE[player.facing]; return; }

  const lane = world.byRow.get(r);
  if (lane && lane.type === LANE.GRASS && lane.obstacles.has(c)) {
    player.model.rotation.y = FACE_ANGLE[player.facing];
    return;
  }

  player.animFrom = { x: player.x, z: player.row };
  player.animTo = { x: c, z: r };
  player.animT = 0;
  player.hopping = true;
  player.row = r;
  player.col = c;
  player.model.rotation.y = FACE_ANGLE[player.facing];

  if (r > score) {
    score = r;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('crossy_best', best); }
  }
}

function getLogUnder(lane) {
  for (const lg of lane.logs) {
    if (player.x + 0.38 > lg.x - lg.len / 2 && player.x - 0.38 < lg.x + lg.len / 2) return lg;
  }
  return null;
}

function hitVehicle(lane) {
  const half = 0.3;
  for (const v of lane.vehicles) {
    if (player.x + half > v.x - v.len / 2 + 0.06 && player.x - half < v.x + v.len / 2 - 0.06) return true;
  }
  return false;
}

function killPlayer(cause) {
  if (player.dead) return;
  player.dead = true; player.deathAnim = 0; player.deathCause = cause;
  spawnDeathParticles(cause);
  triggerDeathFlash(cause);
  camState.shake = cause === 'drown' ? 0.3 : 0.55;
}

function triggerDeathFlash(cause) {
  deathFlashEl.style.transition = 'none';
  deathFlashEl.style.background = cause === 'drown' ? 'rgba(70,160,255,0.55)' : 'rgba(255,30,30,0.6)';
  deathFlashEl.style.opacity = '1';
  void deathFlashEl.offsetWidth; // force reflow so the transition below animates from opacity 1
  deathFlashEl.style.transition = `opacity ${DEATH_DUR}ms ease-out`;
  deathFlashEl.style.opacity = '0';
}

function spawnDeathParticles(cause) {
  const n = cause === 'drown' ? 18 : 26;
  for (let i = 0; i < n; i++) {
    let color;
    if (cause === 'drown') {
      color = Math.random() < 0.6 ? 0x8fd6ff : 0xffffff; // splash droplets + foam
    } else {
      const r = Math.random();
      color = r < 0.55 ? 0xfbf3e6 : r < 0.8 ? 0xff7a3d : 0xe53935; // feathers, beak, comb bits
    }
    const size = rand(0.06, 0.15);
    const m = new THREE.Mesh(unitBox, mat(color));
    m.scale.set(size, size, size);
    m.position.set(player.x, 0.4, player.z);
    m.castShadow = true;
    scene.add(m);
    const ang = Math.random() * Math.PI * 2;
    const spd = rand(2, 5.5);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3(Math.cos(ang) * spd, rand(3, 6.5), Math.sin(ang) * spd),
      life: rand(700, 1100),
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    const s = dt / 1000;
    p.vel.y -= 9.8 * s;
    p.mesh.position.addScaledVector(p.vel, s);
    p.mesh.rotation.x += 4 * s;
    p.mesh.rotation.y += 3 * s;
    if (p.life <= 0 || p.mesh.position.y < -2) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// ─────────────────────────────────────────────
//  Update
// ─────────────────────────────────────────────

function updateRail(lane, dt) {
  lane.timer -= dt;
  const pulse = (Math.sin(performance.now() * 0.02) + 1) / 2;
  if (lane.state === 'idle') {
    for (const l of lane.lamps) l.material.emissive.setHex(0x000000);
    if (lane.timer <= 0) { lane.state = 'warn'; lane.timer = 1000; }
  } else if (lane.state === 'warn') {
    for (const l of lane.lamps) {
      l.material.color.setHex(PALETTE.trainWarn);
      l.material.emissive.setHex(0x330000);
      l.material.emissiveIntensity = pulse;
    }
    if (lane.timer <= 0) {
      lane.state = 'go';
      const m = buildTrain(lane.trainColor);
      const startX = lane.dir > 0 ? COL0 - 4 : COL1 + 4;
      m.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      m.position.set(startX, 0, 0);
      lane.sceneGroup.add(m);
      lane.trainMesh = m;
    }
  } else if (lane.state === 'go') {
    for (const l of lane.lamps) l.material.emissiveIntensity = pulse;
    if (lane.trainMesh) {
      lane.trainMesh.position.x += lane.dir * lane.trainSpeed * dt * 0.001;
      const endX = lane.dir > 0 ? COL1 + 6 : COL0 - 6;
      if ((lane.dir > 0 && lane.trainMesh.position.x > endX) ||
          (lane.dir < 0 && lane.trainMesh.position.x < endX)) {
        lane.sceneGroup.remove(lane.trainMesh);
        lane.trainMesh = null;
        lane.state = 'idle';
        lane.timer = rand(2500, 5500);
        lane.dir = Math.random() < 0.5 ? 1 : -1;
        for (const l of lane.lamps) { l.material.color.setHex(0x333333); l.material.emissiveIntensity = 0; }
      }
    }
  }
}

function update(dt) {
  if (gameState !== 'playing') return;

  const lane = world.byRow.get(player.row);

  for (const l of world.lanes) {
    if (!l.sceneGroup) continue;
    if (l.type === LANE.ROAD) {
      for (let i = 0; i < l.vehicles.length; i++) {
        const v = l.vehicles[i];
        v.x += l.dir * l.speed * dt * 0.001;
        const half = COLS / 2 + 3;
        if (v.x > half) v.x = -half;
        if (v.x < -half) v.x = half;
        l.vehicleMeshes[i].position.x = v.x;
      }
    }
    if (l.type === LANE.WATER) {
      for (let i = 0; i < l.logs.length; i++) {
        const lg = l.logs[i];
        lg.x += l.dir * l.speed * dt * 0.001;
        const half = COLS / 2 + 4;
        if (lg.x > half) lg.x = -half;
        if (lg.x < -half) lg.x = half;
        l.logMeshes[i].position.x = lg.x;
      }
    }
    if (l.type === LANE.RAIL) updateRail(l, dt);
  }

  if (player.hopping) {
    player.animT += dt;
    const t = clamp(player.animT / MOVE_DUR, 0, 1);
    const e = easeOutQuad(t);
    player.x = lerp(player.animFrom.x, player.animTo.x, e);
    player.z = lerp(player.animFrom.z, player.animTo.z, e);
    const hop = Math.sin(t * Math.PI) * 0.5;
    player.model.position.set(player.x, hop, -player.z);
    const sq = 1 + Math.sin(t * Math.PI) * 0.18;
    player.model.scale.set(1 / sq, sq, 1 / sq);
    const legs = player.model.userData;
    legs.legL.rotation.x = Math.sin(t * Math.PI) * 0.9;
    legs.legR.rotation.x = -Math.sin(t * Math.PI) * 0.9;
    if (t >= 1) {
      player.x = player.animTo.x; player.z = player.animTo.z;
      player.model.position.set(player.x, 0, -player.z);
      player.model.scale.set(1, 1, 1);
      legs.legL.rotation.x = 0; legs.legR.rotation.x = 0;
      player.hopping = false; player.animFrom = null;
    }
  } else if (moveQueue.length > 0) {
    tryMove(moveQueue.shift());
  }

  if (lane && lane.type === LANE.WATER && !player.hopping) {
    const lg = getLogUnder(lane);
    if (lg) {
      player.x += lane.dir * lane.speed * dt * 0.001;
      player.model.position.x = player.x;
      player.onLog = lg;
    } else {
      player.onLog = null;
    }
  } else {
    player.onLog = null;
  }

  if (!player.dead && (player.x < COL0 - 0.6 || player.x > COL1 + 0.6)) { killPlayer('drown'); }

  if (!player.hopping && !player.dead && lane) {
    if (lane.type === LANE.ROAD && hitVehicle(lane)) killPlayer('hit');
    else if (lane.type === LANE.WATER && !getLogUnder(lane)) killPlayer('drown');
    else if (lane.type === LANE.RAIL && lane.state === 'go' && lane.trainMesh) {
      const half = 0.32;
      const tx = lane.trainMesh.position.x;
      if (player.x + half > tx - 1.7 && player.x - half < tx + 1.7) killPlayer('hit');
    }
  }

  updateVisibleLanes();
  if (player.row > world.topGenerated - 25) extendWorld();

  if (player.dead) {
    player.deathAnim += dt;
    // Hold the very first instant still (hit-stop) so the impact reads clearly
    // before the tumble/sink plays out.
    const t = clamp((player.deathAnim - DEATH_FREEZE) / (DEATH_DUR - DEATH_FREEZE), 0, 1);
    if (player.deathCause === 'drown') {
      player.model.position.y = -t * 1.2;
      player.model.rotation.z = t * Math.PI * 1.5;
      player.model.scale.setScalar(1 - t * 0.4);
    } else {
      player.model.rotation.x = -t * Math.PI * 0.5;
      player.model.scale.set(1 + t * 0.3, Math.max(0.05, 1 - t * 0.9), 1 + t * 0.3);
    }
    if (player.deathAnim > DEATH_DUR) showGameOver();
  }

  updateParticles(dt);
  updateCamera(dt);
}

function updateCamera(dt) {
  const followX = player.x;
  const followZ = -player.z;
  camState.x = lerp(camState.x, followX, Math.min(dt * 0.008, 1));
  camState.targetZ = lerp(camState.targetZ, followZ, Math.min(dt * 0.008, 1));
  const target = new THREE.Vector3(camState.x, 0, camState.targetZ - LOOK_AHEAD);
  // Mostly top-down view, tilted slightly back (south) so north (increasing row)
  // still reads as up on screen, with no left-right skew.
  camera.up.set(0, 1, 0);
  camera.position.copy(target).addScaledVector(CAM_DIR, CAM_DIST);
  camera.lookAt(target);
  if (camState.shake > 0) {
    camState.shake = Math.max(0, camState.shake - dt * 0.0022);
    const s = camState.shake;
    camera.position.x += (Math.random() * 2 - 1) * s;
    camera.position.y += (Math.random() * 2 - 1) * s * 0.6;
    camera.position.z += (Math.random() * 2 - 1) * s;
  }
  sun.position.copy(target.clone().add(new THREE.Vector3(-6, 10, 8)));
  sun.target.position.copy(target);
}

// ─────────────────────────────────────────────
//  Loop
// ─────────────────────────────────────────────

let lastTime = 0;
function loop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  if (gameState === 'playing') update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// Boot
world = initWorld();
player = initPlayer();
resetPlayer();
updateVisibleLanes();
score = 0;
best = parseInt(localStorage.getItem('crossy_best') || '0');
gameState = 'start';
camState = { x: 0, z: 0, targetZ: 0, shake: 0 };
bestEl.textContent = best;

startScreen.classList.remove('hidden');
hud.classList.add('hidden');
gameoverScreen.classList.add('hidden');

requestAnimationFrame(ts => {
  lastTime = ts;
  updateCamera(0);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
});
