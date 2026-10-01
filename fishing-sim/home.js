// Tiny Tides — your home: a room you decorate, with all your tanks in it.
// Tap a tank to open it. Press Decorate to drag furniture (and tanks) around,
// flip things, or put furniture away. Friends can look around when they visit.

const homeEdit = { on: false, sel: null, drag: null };
// null for your own home, or { owner, home, tanks } for a friend's (read-only)
let homeView = null;
const homeData = () => (homeView ? homeView.home : save.home);
const homeTanks = () => (homeView ? homeView.tanks : save.tanks);

// A friend's home from their world snapshot. Older saves (one tank, no room)
// go through the same clean-up as ours, so they get a room with their tank.
function friendHomeView(w) {
  const s = sanitizeSave(Object.assign(freshSave(), {
    tanks: w.tanks, home: w.home, mainTank: w.mainTank,
    aquarium: w.aquarium, decor: w.decor, tankLvl: w.tankLvl,
  }));
  return { owner: w.host || w.username, home: s.home, tanks: s.tanks };
}

function openHome(view = null) {
  homeView = view;
  homeEdit.on = false;
  homeEdit.sel = null;
  homeEdit.drag = null;
  renderHome();
  openModal('modal-home');
  Sound.sfx.open();
}

function renderHome() {
  const own = !homeView;
  $('#home-h').textContent = own ? 'Home' : `@${homeView.owner}'s home`;
  $('#home-count').textContent = `${homeTanks().length} tank${homeTanks().length === 1 ? '' : 's'}`;
  $('#btn-home-decorate').hidden = !own;
  $('#btn-home-shop').hidden = !own || homeEdit.on;
  $('#btn-home-decorate').textContent = homeEdit.on ? 'Done' : 'Decorate';
  $('#btn-home-decorate').setAttribute('aria-pressed', String(homeEdit.on));
  $('#home-canvas').classList.toggle('editing', homeEdit.on);
  $('#home-hint').textContent = homeEdit.on ? 'Drag things to move them. Tap one to flip it or put it away.'
    : own ? 'Tap a tank to look inside. Press Decorate to rearrange.'
    : `Tap a tank to peek inside. Just looking: this is @${homeView.owner}'s place!`;
  renderHomePanel();
}

// ------------------------------------------------------------- drawing --
function drawHome() {
  if (openId !== 'modal-home') return;
  const c = $('#home-canvas'), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const t = performance.now() / 1000;
  drawRoom(g, homeData(), homeTanks(), t);
  updateHomeTags();
}

function drawRoom(g, home, tanks, t) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const wall = WALLPAPERS.find(w => w.id === home.wall) || WALLPAPERS[0];
  const floor = FLOORS.find(f => f.id === home.floor) || FLOORS[0];
  // the wall
  R(0, 0, HOME_W, HOME_FLOOR, wall.a);
  if (wall.stripes) for (let x = 0; x < HOME_W; x += 10) R(x, 0, 5, HOME_FLOOR, wall.b);
  if (wall.dots) for (let y = 6; y < HOME_FLOOR; y += 12) for (let x = (y / 12) % 2 ? 6 : 12; x < HOME_W; x += 12) R(x, y, 2, 2, wall.b);
  if (wall.stars) for (let i = 0; i < 40; i++) { const x = (i * 71) % HOME_W, y = (i * 37) % (HOME_FLOOR - 4); if (Math.sin(t * 2 + i) > -0.3) R(x, y, 1, 1, wall.b); }
  // a window showing the real sky right now
  const pal = G.pal || PHASES[0];
  R(138, 16, 44, 40, '#8a5a3a');
  pal.sky.forEach((col, i) => R(141, 19 + i * 5, 38, 5, col));
  if ((pal.stars || 0) > 0.2) for (let i = 0; i < 7; i++) R(143 + (i * 13) % 34, 21 + (i * 7) % 18, 1, 1, '#fff8e0');
  R(159, 19, 2, 34, '#8a5a3a'); R(141, 35, 38, 2, '#8a5a3a'); R(136, 56, 48, 3, '#a8703e');
  // baseboard and floor
  R(0, HOME_FLOOR - 3, HOME_W, 3, '#8a5a3a');
  R(0, HOME_FLOOR, HOME_W, HOME_H - HOME_FLOOR, floor.a);
  if (floor.checker) {
    for (let y = HOME_FLOOR; y < HOME_H; y += 10) for (let x = (Math.floor((y - HOME_FLOOR) / 10) % 2) * 14; x < HOME_W; x += 28) R(x, y, 14, 10, floor.b);
  } else if (floor.id === 'wood') {
    for (let y = HOME_FLOOR + 5; y < HOME_H; y += 6) { R(0, y, HOME_W, 1, floor.b); for (let x = ((y / 6) % 2) * 20; x < HOME_W; x += 40) R(x, y - 5, 1, 5, floor.b); }
  } else {
    for (let i = 0; i < 60; i++) R((i * 53) % HOME_W, HOME_FLOOR + (i * 29) % (HOME_H - HOME_FLOOR), 2, 1, floor.b);
  }
  // furniture and tanks: wall things, then rugs, then the floor back to front
  const placed = home.items.filter(it => it.placed);
  const isWall = it => it.id !== 'tank' && FURNITURE_BY_ID[it.id].wall;
  const order = [
    ...placed.filter(isWall).sort((a, b) => a.y - b.y),
    ...placed.filter(it => it.id === 'rug'),
    ...placed.filter(it => !isWall(it) && it.id !== 'rug').sort((a, b) => a.y - b.y),
  ];
  for (const it of order) drawRoomItem(g, it, tanks, t);
  // evenings get cosy: the room dims and the lamps glow
  const night = clamp(pal.night || 0, 0, 1);
  if (night > 0.05) {
    g.fillStyle = `rgba(30,16,50,${(0.22 * night).toFixed(2)})`;
    g.fillRect(0, 0, HOME_W, HOME_H);
    for (const it of placed) {
      const glowAt = { lamp: [5, -30], fireplace: [17, -8], chandelier: [15, -12], lights: [30, -4], arcade: [10, -28] }[it.id];
      if (!glowAt) continue;
      const def = FURNITURE_BY_ID[it.id];
      disc(g, it.x - def.w / 2 + glowAt[0], it.y + glowAt[1], 16, `rgba(255,210,122,${(0.14 * night).toFixed(2)})`);
    }
  }
  if (homeEdit.on && !homeView) {
    for (const it of placed) {
      const b = roomItemBox(it, tanks), sel = it.uid === homeEdit.sel;
      g.strokeStyle = sel ? '#ffd27a' : 'rgba(255,255,255,0.45)';
      g.setLineDash(sel ? [2, 1] : [1, 2]);
      g.strokeRect(Math.round(b.x) - 1.5, Math.round(b.y) - 1.5, b.w + 3, b.h + 3);
    }
    g.setLineDash([]);
  }
}

const roomItemBox = (it, tanks) => { const d = roomItemDef(it, tanks); return { x: it.x - d.w / 2, y: it.y - d.h, w: d.w, h: d.h }; };

function drawRoomItem(g, it, tanks, t) {
  const def = roomItemDef(it, tanks);
  g.save();
  g.translate(Math.round(it.x), Math.round(it.y));
  if (it.flip) g.scale(-1, 1);
  const L = -Math.floor(def.w / 2);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(L + x, y, w, h); };
  if (it.id === 'tank') drawRoomTank(R, def.w, tanks.find(x => x.uid === it.tank), t);
  else drawFurniture(R, it, t);
  g.restore();
}

// A tank on its stand, with tiny versions of the fish inside swimming about.
function drawRoomTank(R, w, tank, t) {
  R(0, -12, w, 12, '#8a5a3a'); R(0, -12, w, 1, '#a8703e'); R(2, -9, w - 4, 7, '#6a3a2e');
  R(-1, -37, w + 2, 25, OUTLINE);
  R(0, -36, w, 23, '#7fd0e8'); R(0, -36, w, 4, '#a8e4f0'); R(0, -16, w, 3, '#f0d0a0');
  R(-1, -38, w + 2, 2, '#4a3a5a');
  R(3, -22, 1, 6, '#5aa860'); R(w - 5, -24, 1, 8, '#5aa860');
  const fish = tank ? tank.fish.slice(0, 10) : [];
  fish.forEach((c, i) => {
    const sp = FISH_BY_ID[c.id];
    if (!sp) return;
    const span = w - 8, phase = i * 1.9 + c.uid;
    const x = 4 + (Math.sin(t * (0.4 + (i % 3) * 0.15) + phase) * 0.5 + 0.5) * span;
    const y = -31 + ((i * 5) % 13);
    const dir = Math.cos(t * (0.4 + (i % 3) * 0.15) + phase) > 0 ? 1 : -1;
    const col = sp.body || (sp.pal && Object.values(sp.pal)[0]) || '#ff8a6b';
    R(x, y, 3, 2, col); R(x + (dir > 0 ? -1 : 3), y, 1, 2, sp.fin || col);
  });
  R(1, -35, 1, 18, 'rgba(255,255,255,0.4)');
}

function drawFurniture(R, it, t) {
  const blink = k => Math.sin(t * 3 + k + it.uid) > -0.4;
  switch (it.id) {
    case 'plant':
      R(3, -7, 6, 7, '#c07850'); R(2, -8, 8, 2, '#e09a68');
      R(5, -18, 2, 10, '#5aa860'); R(1, -15, 4, 3, '#6fbf73'); R(7, -16, 4, 3, '#6fbf73'); R(2, -12, 3, 2, '#5aa860'); R(7, -12, 3, 2, '#5aa860');
      break;
    case 'rug':
      R(4, -8, 36, 8, '#e0566e'); R(0, -6, 44, 4, '#e0566e'); R(8, -7, 28, 6, '#ffd27a'); R(4, -5, 36, 2, '#ffd27a'); R(14, -5, 16, 2, '#e0566e');
      break;
    case 'lamp':
      R(2, -2, 6, 2, '#4a3a4a'); R(4, -26, 2, 24, '#6a5a6a'); R(0, -34, 10, 8, '#ffd27a'); R(1, -35, 8, 1, '#ffd27a'); R(0, -27, 10, 1, '#e0a050');
      break;
    case 'painting':
      R(0, -18, 26, 18, '#a8603e'); ['#ffb0a0', '#ffc8a0', '#ffe0b0'].forEach((col, i) => R(2, -16 + i * 3, 22, 3, col));
      R(6, -12, 4, 4, '#fff0b0'); R(2, -7, 22, 5, '#7a6ab0'); R(14, -8, 8, 2, '#6a3a2e'); R(17, -11, 1, 3, '#6a3a2e');
      break;
    case 'chair':
      R(2, -4, 2, 4, '#6a3a2e'); R(14, -4, 2, 4, '#6a3a2e'); R(1, -22, 16, 18, '#e0566e'); R(3, -20, 12, 9, '#ff8a9a');
      R(0, -12, 3, 8, '#c04050'); R(15, -12, 3, 8, '#c04050'); R(2, -9, 14, 3, '#ff8a9a');
      break;
    case 'table':
      R(0, -16, 24, 3, '#a8603e'); R(0, -16, 24, 1, '#c88a5a'); R(2, -13, 2, 13, '#8a4f3a'); R(20, -13, 2, 13, '#8a4f3a');
      R(7, -21, 7, 5, '#7fb8e6'); R(14, -20, 2, 2, '#7fb8e6'); R(9, -22, 3, 1, '#7fb8e6'); R(18, -20, 2, 4, '#ff9ec4'); R(18, -22, 2, 2, '#ffd23f');
      break;
    case 'clock':
      R(3, -14, 8, 14, '#fff4e0'); R(1, -12, 12, 10, '#fff4e0'); R(0, -10, 14, 6, '#fff4e0');
      R(3, -14, 8, 1, '#a8603e'); R(3, -1, 8, 1, '#a8603e');
      R(7, -11, 1, 4, OUTLINE); R(7, -7, 3, 1, OUTLINE);
      break;
    case 'beanbag':
      R(5, -13, 12, 4, '#8fd19e'); R(2, -10, 18, 10, '#8fd19e'); R(0, -6, 22, 6, '#8fd19e'); R(2, -3, 18, 3, '#6fb07e'); R(6, -11, 6, 2, '#b8f0c8');
      break;
    case 'bookshelf': {
      R(0, -38, 24, 38, '#8a4f3a'); R(0, -38, 24, 1, '#a8703e');
      const cols = ['#e0566e', '#7fb8e6', '#ffd23f', '#8fd19e', '#c79bf2', '#ff8a6b'];
      [-35, -24, -13].forEach((y, row) => {
        R(2, y, 20, 9, '#5a3028');
        for (let b = 0; b < 6; b++) R(3 + b * 3, y + 2 + ((b + row) % 3), 2, 7 - ((b + row) % 3), cols[(b + row * 2) % cols.length]);
      });
      break;
    }
    case 'lights': {
      const cols = ['#ff6a7a', '#ffd23f', '#7ad0f0', '#8fe0a0'];
      for (let i = 0; i <= 20; i++) {
        const x = i * 3, y = -7 + Math.round(Math.sin((i / 20) * Math.PI) * 5);
        R(x, y, 1, 1, '#4a3a4a');
        if (i % 2 === 0) R(x, y + 1, 1, 2, blink(i) ? cols[(i / 2) % cols.length] : '#6a5a6a');
      }
      break;
    }
    case 'bed':
      R(0, -22, 6, 22, '#8a4f3a'); R(0, -14, 44, 14, '#a8603e'); R(4, -15, 40, 5, '#ffffff');
      R(14, -15, 30, 8, '#7fb8e6'); R(18, -13, 2, 1, '#ffffff'); R(28, -11, 2, 1, '#ffffff'); R(38, -13, 2, 1, '#ffffff');
      R(6, -18, 9, 4, '#fff4e0');
      break;
    case 'mirror':
      R(2, -20, 12, 20, '#e0b040'); R(0, -16, 16, 12, '#e0b040'); R(4, -18, 8, 16, '#c8e8f8'); R(2, -14, 12, 8, '#c8e8f8'); R(5, -16, 2, 6, '#ffffff');
      break;
    case 'sofa':
      R(3, -22, 40, 10, '#b48ae0'); R(0, -12, 46, 10, '#c79bf2'); R(0, -16, 6, 14, '#a878d8'); R(40, -16, 6, 14, '#a878d8');
      R(7, -14, 15, 4, '#d8b8f8'); R(24, -14, 15, 4, '#d8b8f8'); R(2, -2, 2, 2, '#6a3a2e'); R(42, -2, 2, 2, '#6a3a2e');
      break;
    case 'poster':
      R(0, -24, 18, 24, '#7a4ab8'); R(1, -23, 16, 22, '#8a5ac8');
      R(7, -19, 4, 4, '#6e4430'); R(6, -15, 6, 8, '#ffd23f'); R(8, -13, 2, 2, '#7a4ab8'); R(4, -14, 2, 5, '#6e4430'); R(12, -14, 2, 5, '#6e4430');
      R(6, -7, 2, 4, '#ffd23f'); R(10, -7, 2, 4, '#ffd23f'); R(2, -22, 1, 1, '#ffd23f'); R(15, -3, 1, 1, '#ffd23f'); R(8, -24, 2, 1, '#e0566e');
      break;
    case 'fireplace': {
      R(0, -32, 34, 32, '#a8a0b8'); R(-1, -32, 36, 3, '#8a4f3a');
      for (let y = -28; y < 0; y += 5) for (let x = (y % 2 ? 0 : 4); x < 34; x += 8) R(x, y, 1, 4, '#8a8098');
      R(7, -22, 20, 22, '#2a1a2e');
      const f = Math.round(Math.sin(t * 9 + it.uid) * 1.5);
      R(11, -8 + f, 12, 6 - f, '#ff7a3c'); R(13, -12 + f, 8, 4, '#ffd23f'); R(16, -15 + f, 2, 3, '#fff3a0'); R(9, -3, 16, 3, '#6a3a2e');
      break;
    }
    case 'piano':
      R(0, -30, 38, 18, '#2a2a3a'); R(0, -30, 38, 1, '#4a4a5a'); R(2, -12, 34, 4, '#ffffff');
      for (let x = 4; x < 36; x += 4) if (x % 12 !== 0) R(x, -12, 2, 2, '#2a2a3a');
      R(0, -8, 38, 2, '#2a2a3a'); R(2, -6, 2, 6, '#2a2a3a'); R(34, -6, 2, 6, '#2a2a3a'); R(30, -34, 2, 4, '#fff4e0'); R(30, -36, 2, 2, '#ffd23f');
      break;
    case 'arcade':
      R(0, -40, 20, 40, '#e0566e'); R(2, -40, 16, 4, '#ffd23f'); R(3, -34, 14, 11, '#2a2a5a');
      R(5 + Math.round(Math.sin(t * 2) * 3), -29, 3, 2, '#ff9ec4'); R(12, -31, 2, 2, '#7ae0ff'); if (blink(1)) R(5, -32, 1, 1, '#ffffff');
      R(2, -20, 16, 4, '#3a3a4a'); R(6, -23, 2, 3, '#ff4a4a'); R(12, -22, 2, 2, '#7ae0ff'); R(2, -14, 16, 1, '#b83a55');
      break;
    case 'trophyfish':
      R(0, -16, 30, 16, '#8a4f3a'); R(2, -14, 26, 12, '#a8603e');
      R(7, -11, 14, 6, '#ffd23f'); R(5, -10, 2, 4, '#ffd23f'); R(21, -12, 4, 8, '#e0a020'); R(9, -10, 1, 1, OUTLINE); R(8, -11, 10, 1, '#fff3a0');
      break;
    case 'chandelier':
      R(14, -22, 2, 8, '#c8a040'); R(2, -14, 26, 3, '#ffd23f'); R(6, -11, 18, 2, '#e0b030');
      for (let i = 0; i < 5; i++) { R(3 + i * 6, -18, 2, 4, '#fff4e0'); if (blink(i)) R(3 + i * 6, -20, 2, 2, '#ffd23f'); R(4 + i * 6, -9, 1, 3, '#c8f0ff'); }
      break;
    case 'throne':
      R(4, -40, 18, 26, '#ffd23f'); R(4, -42, 2, 2, '#ffd23f'); R(12, -43, 2, 3, '#ffd23f'); R(20, -42, 2, 2, '#ffd23f');
      R(7, -36, 12, 20, '#b8302a'); R(0, -16, 26, 6, '#ffd23f'); R(0, -16, 26, 1, '#fff3a0');
      R(1, -10, 4, 10, '#e0a020'); R(21, -10, 4, 10, '#e0a020'); R(12, -38, 2, 2, '#7ae0ff'); R(5, -14, 2, 2, '#e0566e'); R(19, -14, 2, 2, '#8fe0a0');
      break;
  }
}

// Tank names float over the room as HTML, so they stay crisp.
function updateHomeTags() {
  const box = $('#home-tags');
  const tanks = homeTanks(), items = homeData().items.filter(it => it.id === 'tank');
  const wanted = new Set();
  for (const it of items) {
    const tank = tanks.find(x => x.uid === it.tank);
    if (!tank) continue;
    const key = String(it.uid);
    wanted.add(key);
    let el = box.querySelector(`[data-key="${key}"]`);
    if (!el) { el = document.createElement('span'); el.className = 'home-tag'; el.dataset.key = key; box.appendChild(el); }
    const text = `${tank.name} · ${tank.fish.length}`;
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle('main', !homeView && tank.uid === save.mainTank && tanks.length > 1);
    el.style.left = `${(it.x / HOME_W) * 100}%`;
    el.style.top = `${((it.y - 40) / HOME_H) * 100}%`;
  }
  for (const el of [...box.children]) if (!wanted.has(el.dataset.key)) el.remove();
}

// --------------------------------------------------------- interaction --
const homePoint = e => {
  const r = $('#home-canvas').getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * HOME_W, y: ((e.clientY - r.top) / r.height) * HOME_H };
};

// what's under a point, front-most first
function roomItemAt(x, y) {
  const tanks = homeTanks();
  const isWall = it => it.id !== 'tank' && FURNITURE_BY_ID[it.id].wall;
  const placed = homeData().items.filter(it => it.placed);
  const order = [...placed.filter(it => !isWall(it) && it.id !== 'rug').sort((a, b) => b.y - a.y), ...placed.filter(it => it.id === 'rug'), ...placed.filter(isWall).sort((a, b) => b.y - a.y)];
  return order.find(it => { const b = roomItemBox(it, tanks); return x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2; });
}

$('#home-canvas').addEventListener('pointerdown', e => {
  const { x, y } = homePoint(e);
  const hit = roomItemAt(x, y);
  if (homeEdit.on && !homeView) {
    homeEdit.sel = hit ? hit.uid : null;
    if (hit) {
      homeEdit.drag = { uid: hit.uid, dx: x - hit.x, dy: y - hit.y, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      Sound.sfx.click();
    }
    renderHomePanel();
    return;
  }
  if (!hit || hit.id !== 'tank') return;
  if (homeView) {
    const tank = homeView.tanks.find(t => t.uid === hit.tank);
    if (tank) { forceClose(); openTank({ owner: homeView.owner, uid: tank.uid, name: tank.name, fish: tank.fish, decor: tank.decor }, null, true); }
  } else {
    forceClose();
    openTank(null, hit.tank, true);
  }
});
$('#home-canvas').addEventListener('pointermove', e => {
  if (!homeEdit.drag) return;
  const { x, y } = homePoint(e);
  const it = save.home.items.find(i => i.uid === homeEdit.drag.uid);
  if (!it) return;
  it.x = x - homeEdit.drag.dx;
  it.y = y - homeEdit.drag.dy;
  clampRoomItem(it, save.tanks);
  homeEdit.drag.moved = true;
});
const endHomeDrag = () => { if (homeEdit.drag && homeEdit.drag.moved) persist(); homeEdit.drag = null; };
$('#home-canvas').addEventListener('pointerup', endHomeDrag);
$('#home-canvas').addEventListener('pointercancel', endHomeDrag);

function furnitureSprite(id) {
  return spriteDataUrl('furn:' + id, () => {
    const def = FURNITURE_BY_ID[id];
    const c = document.createElement('canvas');
    c.width = def.w + 8; c.height = def.h + 8;
    const g = c.getContext('2d');
    const it = { uid: 0, id, x: Math.floor(c.width / 2), y: c.height - 3, flip: false };
    g.translate(it.x, it.y);
    const L = -Math.floor(def.w / 2);
    drawFurniture((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(L + x, y, w, h); }, it, 0);
    return c;
  });
}

function renderHomePanel() {
  const panel = $('#home-panel');
  panel.hidden = !homeEdit.on || !!homeView;
  if (panel.hidden) return;
  const sel = save.home.items.find(it => it.uid === homeEdit.sel && it.placed);
  const name = sel ? (sel.id === 'tank' ? (findTank(sel.tank) || {}).name : FURNITURE_BY_ID[sel.id].name) : '';
  $('#home-selected').innerHTML = sel
    ? `<b>${escapeHTML(name || '')}</b>
       <span class="row-actions">
         <button class="btn plain" data-home="flip">Flip</button>
         ${sel.id === 'tank' ? '' : '<button class="btn plain" data-home="store">Put away</button>'}
       </span>
       <span class="fine kbd-only">Arrow keys nudge it too.</span>`
    : `<span class="fine">${save.home.items.filter(it => it.placed && it.id !== 'tank').length}/${MAX_FURNITURE} pieces of furniture placed.</span>
       <button class="btn gold" data-home="shop">Get more furniture</button>`;
  const stored = save.home.items.filter(it => !it.placed);
  $('#home-tray').innerHTML = stored.length ? `<h3>Put away</h3><div class="tray-items">${stored.map(it => `
    <button class="tray-item" data-homeplace="${it.uid}"><img src="${furnitureSprite(it.id)}" alt="" /><span>${FURNITURE_BY_ID[it.id].name}</span></button>`).join('')}</div>` : '';
}

$('#home-panel').addEventListener('click', e => {
  const act = e.target.closest('[data-home]');
  if (act) {
    const sel = save.home.items.find(it => it.uid === homeEdit.sel);
    if (act.dataset.home === 'shop') { forceClose(); openShop(false, 'home'); return; }
    if (sel && act.dataset.home === 'flip') sel.flip = !sel.flip;
    if (sel && act.dataset.home === 'store' && sel.id !== 'tank') { sel.placed = false; homeEdit.sel = null; }
    Sound.sfx.click();
    persist();
    renderHomePanel();
    return;
  }
  const place = e.target.closest('[data-homeplace]');
  if (place) {
    const it = save.home.items.find(i => i.uid === Number(place.dataset.homeplace));
    if (!it) return;
    it.placed = true;
    it.x = HOME_W / 2;
    it.y = FURNITURE_BY_ID[it.id].wall ? 70 : HOME_H - 10;
    clampRoomItem(it, save.tanks);
    homeEdit.sel = it.uid;
    Sound.sfx.buy();
    persist();
    renderHomePanel();
  }
});

$('#btn-home-decorate').addEventListener('click', () => {
  homeEdit.on = !homeEdit.on;
  homeEdit.sel = null;
  homeEdit.drag = null;
  Sound.sfx.click();
  renderHome();
});
$('#btn-home-shop').addEventListener('click', () => { forceClose(); openShop(false, 'home'); });
$('#btn-home').addEventListener('click', () => openHome());

document.addEventListener('keydown', e => {
  if (openId !== 'modal-home' || !homeEdit.on || homeView || isTyping(e.target)) return;
  const it = save.home.items.find(i => i.uid === homeEdit.sel && i.placed);
  if (!it) return;
  const step = e.shiftKey ? 8 : 2;
  const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (move) {
    e.preventDefault();
    it.x += move[0]; it.y += move[1];
    clampRoomItem(it, save.tanks);
    persist();
  }
});

// ------------------------------------------------------ the Home shop --
// New tanks, furniture, wallpaper and floors.
const ownsHomeStyle = (kind, id) => {
  const list = kind === 'wall' ? WALLPAPERS : FLOORS;
  const item = list.find(x => x.id === id);
  return !!item && (item.price === 0 || save.owned.includes(`${kind}:${id}`));
};

function renderHomeShop() {
  const nextPrice = TANK_PRICES[save.tanks.length];
  $('#home-tanks').innerHTML = `
    <ul class="gear-list">${save.tanks.map(t => `
      <li class="gear ${t.uid === save.mainTank ? 'equipped' : ''}"><b>${escapeHTML(t.name)}</b>
        <span class="desc">${t.fish.length}/${tankCapOf(t)} fish · ${TANKS[t.lvl].name}${t.uid === save.mainTank && save.tanks.length > 1 ? ' · main tank' : ''}</span><span class="stats"></span>
        <button class="btn plain" data-opentank="${t.uid}">Open</button></li>`).join('')}
    </ul>
    ${save.tanks.length < MAX_TANKS
      ? `<div class="home-newtank"><span>Another tank, with its own name, fish and props.</span>${buyButton('data-buytank="1"', nextPrice)}</div>`
      : `<p class="fine">That's the most tanks a home can hold (${MAX_TANKS}).</p>`}`;
  const count = id => save.home.items.filter(it => it.id === id).length;
  $('#furn-grid').innerHTML = FURNITURE.map(def => {
    const n = count(def.id);
    return `<div class="item decor-item">
      <img src="${furnitureSprite(def.id)}" alt="" class="furn-img" />
      <span class="name">${def.name}</span>
      <span class="tag">${def.blurb}</span>
      ${n ? `<span class="tag">${n} at home</span>` : ''}
      ${buyButton(`data-buyfurn="${def.id}"`, def.price)}
    </div>`;
  }).join('');
  const styleCards = (kind, list, current) => list.map(st => {
    const owned = ownsHomeStyle(kind, st.id), using = current === st.id;
    const sw = `background:${st.a};${st.checker ? `background-image:linear-gradient(45deg, ${st.b} 25%, transparent 25%, transparent 75%, ${st.b} 75%), linear-gradient(45deg, ${st.b} 25%, transparent 25%, transparent 75%, ${st.b} 75%);background-size:16px 16px;background-position:0 0, 8px 8px;` : st.stripes ? `background-image:repeating-linear-gradient(90deg, ${st.a} 0 6px, ${st.b} 6px 12px);` : `box-shadow:inset 0 -10px 0 ${st.b};`}`;
    return `<div class="item decor-item">
      <span class="style-swatch" style="${sw}"></span>
      <span class="name">${st.name}</span>
      ${using ? '<span class="tag">in use</span>' : owned ? `<button class="btn mint" data-use${kind}="${st.id}">Use</button>` : buyButton(`data-buy${kind}="${st.id}"`, st.price)}
    </div>`;
  }).join('');
  $('#wall-grid').innerHTML = styleCards('wall', WALLPAPERS, save.home.wall);
  $('#floor-grid').innerHTML = styleCards('floor', FLOORS, save.home.floor);
}

// somewhere free on the floor for something new
function freeFloorSpot(w) {
  for (let x = 30; x < HOME_W - 20; x += 12) {
    const clash = save.home.items.some(it => it.placed && !(it.id !== 'tank' && FURNITURE_BY_ID[it.id].wall) && Math.abs(it.x - x) < (roomItemDef(it, save.tanks).w + w) / 2);
    if (!clash) return x;
  }
  return HOME_W / 2;
}

$('#shop-home').addEventListener('click', e => {
  const open = e.target.closest('[data-opentank]');
  if (open) { forceClose(); openTank(null, Number(open.dataset.opentank)); return; }
  if (e.target.closest('[data-buytank]')) {
    const price = TANK_PRICES[save.tanks.length];
    if (save.tanks.length >= MAX_TANKS) return;
    const name = prompt('Name your new tank:', `Tank ${save.tanks.length + 1}`);
    if (name === null) return;
    if (!spend(price)) return;
    const t = newTank(save.nextTank++, name.replace(/\s+/g, ' ').trim().slice(0, 20) || `Tank ${save.tanks.length + 1}`);
    save.tanks.push(t);
    save.home.items.push(clampRoomItem({ uid: save.home.nextItem++, id: 'tank', tank: t.uid, x: freeFloorSpot(TANK_ROOM_W[0]), y: 150, flip: false, placed: true }, save.tanks));
    persist();
    toast(`${t.name} is in your home! Open it to make it your main tank.`);
    renderHomeShop(); refreshHUD();
    return;
  }
  const bf = e.target.closest('[data-buyfurn]');
  if (bf) {
    const def = FURNITURE_BY_ID[bf.dataset.buyfurn];
    if (save.home.items.length >= 200) { toast('Your home is very full! Put some things away first.'); return; }
    if (!spend(def.price)) return;
    const placed = save.home.items.filter(it => it.placed && it.id !== 'tank').length < MAX_FURNITURE;
    save.home.items.push(clampRoomItem({ uid: save.home.nextItem++, id: def.id, x: def.wall ? rand(def.w, HOME_W - def.w) : freeFloorSpot(def.w), y: def.wall ? rand(def.h + 10, HOME_FLOOR - 10) : rand(HOME_FLOOR + 14, HOME_H - 6), flip: false, placed }, save.tanks));
    persist();
    toast(placed ? `${def.name} is in your home! Press Decorate there to move it.` : `${def.name} is waiting in your home's tray`);
    renderHomeShop(); refreshHUD();
    return;
  }
  for (const kind of ['wall', 'floor']) {
    const buy = e.target.closest(`[data-buy${kind}]`), use = e.target.closest(`[data-use${kind}]`);
    if (!buy && !use) continue;
    const id = (buy || use).dataset[`buy${kind}`] || (buy || use).dataset[`use${kind}`];
    if (buy) {
      const st = (kind === 'wall' ? WALLPAPERS : FLOORS).find(x => x.id === id);
      if (!spend(st.price)) return;
      save.owned.push(`${kind}:${id}`);
    } else Sound.sfx.click();
    save.home[kind] = id;
    persist();
    renderHomeShop(); refreshHUD();
    return;
  }
});
