// Tiny Tides — the HTML side: HUD, menus, shop, tank, Fishdex, input.

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const coinHTML = n => `<span class="coin-icon" aria-hidden="true"></span>${n}`;
const starText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ============================================================ prompt/toast ==
let lastPrompt = null;
function setPrompt(text) {
  if (text === lastPrompt) return;
  lastPrompt = text;
  $('#prompt').textContent = text;
}

function toast(text, kind = '') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 2400);
}

function refreshHUD() {
  $('#coins').textContent = save.coins;
  $$('.coins-mirror').forEach(e => { e.textContent = save.coins; });
  $('#bucket-count').textContent = `${save.bucket.length}/${bucketCap()}`;
  $('#tank-pill-count').textContent = `${mainTank().fish.length}/${tankCap()}`;
  const phase = PHASES.find(p => p.id === G.phaseId);
  $('#phase-pill').textContent = `${G.visit ? `@${G.visit.host} · ` : ''}${currentLoc().name} · ${phase ? phase.name : ''}`;
  if (typeof Net !== 'undefined') Net.renderBar();
  $('#btn-map').classList.toggle('glow', !!save.newSpot);
  if (openId === 'modal-shop') renderShop();
  if (openId === 'modal-map') renderMap();
  if (openId === 'modal-tank') renderTank();
  if (openId === 'modal-charms') renderCharms();
  if (openId === 'modal-bucket') renderBucket();
  if (openId === 'modal-home') renderHome();
  renderBoosts();
}

// ================================================================= modals ==
let openId = null, returnFocus = null;
const LOCKED_MODALS = new Set(['modal-title', 'modal-catch']);

function openModal(id) {
  if (openId && openId !== id) $('#' + openId).hidden = true;
  cancelInput();
  if (!openId) returnFocus = document.activeElement;
  openId = id;
  const m = $('#' + id);
  m.hidden = false;
  const first = m.querySelector('[data-autofocus]:not([hidden]):not(:disabled)') || m.querySelector('.close-btn:not([hidden]), .btn:not([hidden]):not(:disabled)');
  if (first) first.focus({ preventScroll: true });
}

function closeModal() {
  if (!openId) return;
  if (openId === 'modal-catch') {
    // Escape keeps the catch (bucket, then tank) if there's room, or else sells it
    resolveCatch('auto');
    return;
  }
  if (openId === 'modal-title' || (openId === 'modal-shop' && shop.creator)) return;
  $('#' + openId).hidden = true;
  if (openId === 'modal-shop') { shop.trial = null; boatShop.trial = null; }
  const backToTitle = openId === 'modal-account' && accountFromTitle;
  openId = null;
  if (backToTitle) { accountFromTitle = false; showTitle(); return; }
  Sound.sfx.click();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
}

function forceClose() {
  if (!openId) return;
  $('#' + openId).hidden = true;
  openId = null;
}

$$('[data-close]').forEach(b => b.addEventListener('click', closeModal));
$$('.modal').forEach(m => m.addEventListener('pointerdown', e => {
  if (e.target === m && !LOCKED_MODALS.has(m.id)) closeModal();
}));

// keep Tab inside the open dialog
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || !openId) return;
  const items = $$(`#${openId} button, #${openId} input, #${openId} summary`).filter(el => !el.disabled && el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// ================================================================== title ==
// After a save is swapped in from the cloud, redraw everything that reads it.
function reloadGameFromSave() {
  Sound.setMuted(save.muted);
  $('#btn-sound').setAttribute('aria-pressed', String(!save.muted));
  initShadows();
  gradientAge = 99;
  tankSwimmers.clear();
  refreshHUD();
  if (openId === 'modal-title') showTitle();
  if (openId === 'modal-tank') renderTank();
  if (openId === 'modal-dex') renderDex();
}

function showTitle() {
  // Logged out, the account buttons lead and playing offline is the quieter option.
  const user = typeof Online !== 'undefined' ? Online.username() : null;
  $('#title-auth').hidden = !!user;
  $('#title-user').hidden = !user;
  $('#title-or').hidden = !!user;
  if (user) $('#title-username').textContent = '@' + user;
  $('#btn-continue').hidden = !save.started;
  $('#btn-reset').hidden = !save.started;
  $('#btn-continue').textContent = user ? 'Keep fishing' : 'Keep fishing offline';
  $('#btn-new').textContent = save.started ? 'New angler' : user ? 'Start' : 'Play offline';
  for (const id of ['btn-continue', 'btn-new']) {
    $('#' + id).classList.toggle('plain', !user);
    $('#' + id).classList.toggle('big', !!user);
  }
  $$('#modal-title [data-autofocus]').forEach(b => b.removeAttribute('data-autofocus'));
  const first = !user ? '#btn-title-signup' : save.started ? '#btn-continue' : '#btn-new';
  $(first).setAttribute('data-autofocus', '');
  openModal('modal-title');
}

$('#btn-continue').addEventListener('click', () => {
  Sound.init();
  forceClose();
  setPrompt(idlePrompt());
  toast(`Welcome back, ${save.name || 'angler'}!`);
});

$('#btn-new').addEventListener('click', () => {
  Sound.init();
  const online = typeof Online !== 'undefined' && Online.loggedIn() ? ` It also replaces your online save for @${Online.username()}.` : '';
  if (save.started && !confirm(`Start a new angler? This erases your coins, fish and outfits.${online}`)) return;
  if (save.started) { resetSave(); refreshHUD(); }
  openShop(true);
});

let accountFromTitle = false;
const openAccountFromTitle = view => () => {
  Sound.init();
  accountFromTitle = true;
  Online.open(view);
};
$('#btn-title-signup').addEventListener('click', openAccountFromTitle('signup'));
$('#btn-title-login').addEventListener('click', openAccountFromTitle('login'));
$('#btn-title-account').addEventListener('click', openAccountFromTitle('profile'));
// logging in from the title goes straight back to it, now with "Keep fishing"
window.addEventListener('tt-login', () => {
  if (openId !== 'modal-account' || !accountFromTitle) return;
  accountFromTitle = false;
  forceClose();
  showTitle();
});

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Erase your save? Coins, fish, outfits and the Fishdex will all be gone.')) return;
  resetSave();
  refreshHUD();
  showTitle();
});

// =================================================================== shop ==
const shop = { tab: 'wardrobe', cat: 'hair', creator: false, trial: null };

function openShop(creator = false, tab = 'wardrobe') {
  shop.creator = creator;
  shop.trial = null;
  boatShop.trial = null;
  shop.tab = creator ? 'wardrobe' : tab;
  $('#name-input').value = save.name;
  renderShop();
  openModal('modal-shop');
  Sound.sfx.open();
}

function previewLook() {
  const look = { ...save.look };
  if (shop.trial) look[shop.trial.cat] = shop.trial.id;
  return look;
}

function renderShop() {
  $('#shop-h').textContent = shop.creator ? 'Make your angler' : 'Shop';
  $('#modal-shop .close-btn').hidden = shop.creator;
  $('#shop-tabs').hidden = shop.creator;
  $('#creator-foot').hidden = !shop.creator;
  $$('#shop-tabs [data-shoptab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.shoptab === shop.tab)));
  $('#shop-wardrobe').hidden = shop.tab !== 'wardrobe';
  $('#shop-tackle').hidden = shop.tab !== 'tackle';
  $('#shop-boat').hidden = shop.tab !== 'boat';
  $('#shop-decor').hidden = shop.tab !== 'decor';
  $('#shop-home').hidden = shop.tab !== 'home';
  if (shop.tab === 'wardrobe') {
    renderCatTabs();
    renderItems();
    renderTryOn();
  } else if (shop.tab === 'boat') {
    renderBoatShop();
  } else if (shop.tab === 'decor') {
    renderDecorShop();
  } else if (shop.tab === 'home') {
    renderHomeShop();
  } else {
    renderTackle();
  }
}

$$('#shop-tabs [data-shoptab]').forEach(b => b.addEventListener('click', () => {
  shop.tab = b.dataset.shoptab;
  shop.trial = null;
  boatShop.trial = null;
  Sound.sfx.click();
  renderShop();
}));

function renderCatTabs() {
  $('#cat-tabs').innerHTML = COSMETIC_TABS.map(t =>
    `<button role="tab" data-cat="${t.id}" aria-selected="${t.id === shop.cat}">${t.label}</button>`).join('');
}

$('#cat-tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  shop.cat = b.dataset.cat;
  Sound.sfx.click();
  renderShop();
});

function anglerThumb(look) {
  return spriteDataUrl('angler:' + JSON.stringify(look), () => anglerSprite(look));
}

function renderItems() {
  const grid = $('#item-grid');
  if (shop.cat === 'colors') {
    const group = (title, key, colors) => `
      <div class="swatch-group">
        <h3>${title}</h3>
        <div class="swatches">
          ${colors.map((c, i) => `<button class="swatch" style="background:${c}" data-color="${key}" data-index="${i}"
            aria-label="${title} colour ${i + 1}" aria-pressed="${save.look[key] === i}"></button>`).join('')}
        </div>
      </div>`;
    grid.innerHTML = group('Skin', 'skin', SKIN_TONES) + group('Hair', 'hairColor', HAIR_COLORS) + group('Top', 'topColor', TOP_COLORS);
    grid.style.display = 'block';
    return;
  }
  grid.style.display = '';
  const cat = shop.cat;
  grid.innerHTML = COSMETICS[cat].map(item => {
    const owned = ownsCosmetic(cat, item.id);
    const wearing = save.look[cat] === item.id;
    const trying = shop.trial && shop.trial.cat === cat && shop.trial.id === item.id;
    let img;
    if (cat === 'buddy') {
      img = item.id === 'none' ? '<span class="tag" style="height:60px;display:flex;align-items:center">just you</span>'
        : `<img src="${spriteDataUrl('buddy:' + item.id, () => buddySprite(item.id))}" alt="" />`;
    } else {
      img = `<img src="${anglerThumb({ ...save.look, [cat]: item.id })}" alt="" />`;
    }
    const status = wearing ? '<span class="tag">wearing</span>'
      : owned ? '<span class="tag">owned</span>'
      : `<span class="price ${save.coins < item.price ? 'cant' : ''}">${coinHTML(item.price)}</span>`;
    return `<button class="item ${cat === 'buddy' ? 'buddy' : ''} ${wearing ? 'wearing' : ''} ${trying ? 'previewing' : ''} ${owned ? '' : 'locked'}"
      data-item="${item.id}" aria-pressed="${wearing}">
      ${img}<span class="name">${item.name}</span>${status}</button>`;
  }).join('');
}

$('#item-grid').addEventListener('click', e => {
  const sw = e.target.closest('[data-color]');
  if (sw) {
    save.look[sw.dataset.color] = Number(sw.dataset.index);
    persist();
    Sound.sfx.click();
    renderShop();
    return;
  }
  const b = e.target.closest('[data-item]');
  if (!b) return;
  const cat = shop.cat, id = b.dataset.item;
  if (ownsCosmetic(cat, id)) {
    save.look[cat] = id;
    shop.trial = null;
    persist();
  } else {
    const same = shop.trial && shop.trial.cat === cat && shop.trial.id === id;
    shop.trial = same ? null : { cat, id };
  }
  Sound.sfx.click();
  renderShop();
});

function renderTryOn() {
  const box = $('#try-on');
  if (!shop.trial) {
    box.innerHTML = shop.creator
      ? 'Pick a look! Items with a price unlock once you earn coins by fishing.'
      : 'Tap anything to try it on.';
    return;
  }
  const item = findCosmetic(shop.trial.cat, shop.trial.id);
  const short = item.price - save.coins;
  box.innerHTML = `Trying on <b>${item.name}</b>` + (short > 0
    ? `<div class="need">Need ${short} more coin${short === 1 ? '' : 's'}${shop.creator ? ' (go fishing first!)' : ''}</div>`
    : `<button class="btn gold" id="btn-buy">Buy for ${coinHTML(item.price)}</button>`);
  const buy = $('#btn-buy');
  if (buy) buy.addEventListener('click', () => {
    const { cat, id } = shop.trial;
    if (!spend(item.price)) return;
    save.owned.push(cat + ':' + id);
    save.look[cat] = id;
    shop.trial = null;
    persist();
    toast(`New ${item.name.toLowerCase()}!`);
    for (let i = 0; i < 10; i++) sparkle(CHAR_X + rand(-10, 10), FEET_Y - 20 + rand(-10, 10));
    renderShop();
  });
}

$('#name-input').addEventListener('input', e => {
  save.name = e.target.value.slice(0, 14);
  persist();
});

$('#btn-begin').addEventListener('click', () => {
  save.name = $('#name-input').value.trim().slice(0, 14) || 'Angler';
  save.started = true;
  persist();
  shop.creator = false;
  forceClose();
  Sound.sfx.buy();
  setPrompt(idlePrompt());
  toast(`Welcome to the dock, ${save.name}!`);
  $('#action-btn').focus({ preventScroll: true });
});

// A Buy button that says how short you are when you can't afford it yet.
function buyButton(attrs, price) {
  const short = price - save.coins;
  if (short <= 0) return `<button class="btn gold" ${attrs}>Buy ${coinHTML(price)}</button>`;
  return `<span class="buy-col"><button class="btn gold" ${attrs} disabled>Buy ${coinHTML(price)}</button>
    <span class="need">${short} more coin${short === 1 ? '' : 's'}</span></span>`;
}

function renderTackle() {
  const rodRows = RODS.map(r => {
    const owned = save.rods.includes(r.id), equipped = save.rod === r.id;
    const btn = equipped ? '<button class="btn plain" disabled>Equipped</button>'
      : owned ? `<button class="btn mint" data-rod="${r.id}">Equip</button>`
      : buyButton(`data-rod="${r.id}"`, r.price);
    return `<li class="gear ${equipped ? 'equipped' : ''}">
      <b><span class="rod-swatch" style="background:${r.color}"></span>${r.name}</b>
      <span class="desc">${r.blurb}</span>
      <span class="stats"><span>Net size ${r.net}</span><span>Reel speed ${Math.round(r.gain * 100)}</span><span>Net speed ${r.netSpeed}</span><span>Grip +${Math.round((1 - r.grip) * 100)}%</span><span>Luck +${Math.round(r.luck * 100)}</span></span>
      ${btn}</li>`;
  }).join('');
  // buckets and tanks upgrade in order, one level at a time
  const upgradeRows = (levels, current, attr, what) => levels.map((b, i) => {
    const btn = i <= current ? `<button class="btn plain" disabled>${i === current ? 'In use' : 'Outgrown'}</button>`
      : i === current + 1 ? buyButton(`${attr}="${i}"`, b.price)
      : '<button class="btn plain" disabled>Upgrade first</button>';
    return `<li class="gear ${i === current ? 'equipped' : ''}">
      <b>${b.name}</b><span class="desc">Holds ${b.cap} ${what}</span><span class="stats"></span>${btn}</li>`;
  }).join('');
  $('#shop-tackle').innerHTML = `<h3>Rods</h3><ul class="gear-list">${rodRows}</ul>
    <h3>Buckets</h3><ul class="gear-list">${upgradeRows(BUCKETS, save.bucketLvl, 'data-bucket', 'fish')}</ul>
    <p class="tank-hint">Tanks are upgraded one at a time from each tank's window, and new tanks are in the Shop's Home tab.</p>`;
}

$('#shop-tackle').addEventListener('click', e => {
  const rb = e.target.closest('[data-rod]');
  if (rb) {
    const r = RODS.find(x => x.id === rb.dataset.rod);
    if (!save.rods.includes(r.id)) {
      if (!spend(r.price)) return;
      save.rods.push(r.id);
      toast(`Got the ${r.name}!`);
    } else Sound.sfx.click();
    save.rod = r.id;
    persist();
    renderShop();
    return;
  }
  const bb = e.target.closest('[data-bucket]');
  if (bb) {
    const i = Number(bb.dataset.bucket);
    if (i !== save.bucketLvl + 1 || !spend(BUCKETS[i].price)) return;
    save.bucketLvl = i;
    persist();
    toast(`Upgraded to the ${BUCKETS[i].name.toLowerCase()}!`);
    refreshHUD();
    return;
  }

});

// ================================================================== boat ==
const boatShop = { cat: 'base', trial: null };
const ownsBoatPart = (cat, id) => {
  const item = BOAT_PARTS[cat].find(i => i.id === id);
  return !!item && (item.price === 0 || save.owned.includes(`boat-${cat}:${id}`));
};

function previewBoat() {
  const boat = { ...save.boat };
  if (boatShop.trial) boat[boatShop.trial.cat] = boatShop.trial.id;
  return boat;
}

const PREVIEW_PAL = { water: ['#7ac0d8', '#5aa0c8', '#3a80b0', '#2a5a8e'], refl: '#ffffff', lamp: 0 };

// A little scene of a boat with its sail up; used for the preview and thumbnails.
function paintBoatScene(g, boat, withAngler, withSail = true) {
  g.imageSmoothingEnabled = false;
  ['#ffd8c0', '#ffc8b0', '#ffb8a8', '#ffa8a0', '#f898a0'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 9, 110, 9); });
  for (let y = 45; y < 64; y += 3) { g.fillStyle = lerpColor('#7ac0d8', '#3a80b0', (y - 45) / 19); g.fillRect(0, y, 110, 3); }
  const bx = 16, by = 50;
  drawBoatBack(g, bx, by, boat);
  if (withAngler) {
    const t = performance.now() / 1000;
    const spr = anglerSprite(save.look, { bob: Math.floor(t * 2) % 2 === 1, blink: (t % 3.7) < 0.12 });
    g.drawImage(spr, bx + 22 - ANGLER_W / 2, by + 3 - ANGLER_FEET);
  }
  drawBoatFront(g, bx, by, PREVIEW_PAL, boat);
  drawBoatExtras(g, bx, by, PREVIEW_PAL, boat, { sail: withSail, lightsFrom: { x: bx + 6, y: by - 14 } });
}

// Each thumbnail zooms in on the part of the boat that item changes.
const BOAT_THUMB_CROP = {
  base: { x: 0, y: 18, w: 110, h: 44 },
  sail: { x: 44, y: 8, w: 44, h: 40 },
  flag: { x: 2, y: 28, w: 32, h: 26 },
  none: { x: 10, y: 26, w: 96, h: 34 },
  fern: { x: 72, y: 32, w: 26, h: 22 },
  flowers: { x: 30, y: 38, w: 30, h: 18 },
  duck: { x: 84, y: 34, w: 22, h: 20 },
  lights: { x: 10, y: 26, w: 96, h: 34 },
};

function boatThumb(boat, cat, id) {
  return spriteDataUrl(`boat:${cat}:${JSON.stringify(boat)}`, () => {
    const full = makeCanvas(110, 64);
    paintBoatScene(full.getContext('2d'), boat, false, cat !== 'base');
    const crop = BOAT_THUMB_CROP[cat === 'decor' ? id : cat] || BOAT_THUMB_CROP.none;
    const c = makeCanvas(crop.w, crop.h);
    c.getContext('2d').drawImage(full, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    return c;
  });
}

function renderBoatShop() {
  $('#boat-tabs').innerHTML = BOAT_TABS.map(t =>
    `<button role="tab" data-boatcat="${t.id}" aria-selected="${t.id === boatShop.cat}">${t.label}</button>`).join('');
  const cat = boatShop.cat;
  $('#boat-grid').innerHTML = BOAT_PARTS[cat].map(item => {
    const owned = ownsBoatPart(cat, item.id);
    const using = save.boat[cat] === item.id;
    const trying = boatShop.trial && boatShop.trial.cat === cat && boatShop.trial.id === item.id;
    const pic = item.color ? `<span class="swatch-big" style="background:${item.color}"></span>`
      : `<img src="${boatThumb({ ...save.boat, [cat]: item.id }, cat, item.id)}" alt="" />`;
    const status = using ? '<span class="tag">on your boat</span>'
      : owned ? '<span class="tag">owned</span>'
      : `<span class="price ${save.coins < item.price ? 'cant' : ''}">${coinHTML(item.price)}</span>`;
    return `<button class="item boat ${using ? 'wearing' : ''} ${trying ? 'previewing' : ''} ${owned ? '' : 'locked'}"
      data-boatitem="${item.id}" aria-pressed="${using}">${pic}<span class="name">${item.name}</span>${status}</button>`;
  }).join('');

  const box = $('#boat-try');
  const style = BOAT_PARTS.base.find(i => i.id === previewBoat().base);
  const colourNote = ['hull', 'trim'].includes(cat) && !style.usesColor
    ? `<div class="need">Your ${style.name.toLowerCase()} has its own colours, so this won't show on it.</div>` : '';
  if (!boatShop.trial) { box.innerHTML = 'Tap anything to try it on your boat.' + colourNote; return; }
  const item = BOAT_PARTS[boatShop.trial.cat].find(i => i.id === boatShop.trial.id);
  const short = item.price - save.coins;
  box.innerHTML = `Trying <b>${item.name}</b>` + (short > 0
    ? `<div class="need">Need ${short} more coin${short === 1 ? '' : 's'}</div>`
    : `<button class="btn gold" id="btn-buy-boat">Buy for ${coinHTML(item.price)}</button>`) + colourNote;
  const buy = $('#btn-buy-boat');
  if (buy) buy.addEventListener('click', () => {
    const { cat: c, id } = boatShop.trial;
    if (!spend(item.price)) return;
    save.owned.push(`boat-${c}:${id}`);
    save.boat[c] = id;
    boatShop.trial = null;
    persist();
    toast(`Your boat got a new ${item.name.toLowerCase()}!`);
    renderShop();
  });
}

$('#boat-tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-boatcat]');
  if (!b) return;
  boatShop.cat = b.dataset.boatcat;
  Sound.sfx.click();
  renderShop();
});

$('#boat-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-boatitem]');
  if (!b) return;
  const cat = boatShop.cat, id = b.dataset.boatitem;
  if (ownsBoatPart(cat, id)) {
    save.boat[cat] = id;
    boatShop.trial = null;
    persist();
  } else {
    const same = boatShop.trial && boatShop.trial.cat === cat && boatShop.trial.id === id;
    boatShop.trial = same ? null : { cat, id };
  }
  Sound.sfx.click();
  renderShop();
});

function drawBoatPreview() {
  if (openId !== 'modal-shop' || shop.tab !== 'boat') return;
  paintBoatScene($('#boat-preview').getContext('2d'), previewBoat(), true);
}

// The little animated angler in the wardrobe.
function drawPreview() {
  if (openId !== 'modal-shop' || shop.tab !== 'wardrobe') return;
  const c = $('#preview'), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const bands = ['#ffc9a0', '#ffb890', '#ffa888', '#ff9a80'];
  bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 9, 64, 9); });
  g.fillStyle = '#fff0c4';
  for (let dy = -6; dy <= 0; dy++) {
    const half = Math.floor(Math.sqrt(36 - dy * dy));
    g.fillRect(48 - half, 30 + dy, half * 2 + 1, 1);
  }
  g.fillStyle = '#c07850'; g.fillRect(0, 36, 64, 8);
  g.fillStyle = '#e09a68'; g.fillRect(0, 36, 64, 1);
  g.fillStyle = '#8a4f3a'; g.fillRect(0, 40, 64, 1);
  const t = performance.now() / 1000;
  const look = previewLook();
  const spr = anglerSprite(look, { bob: Math.floor(t * 2) % 2 === 1, blink: (t % 3.7) < 0.12 });
  g.fillStyle = 'rgba(42,26,46,0.25)'; g.fillRect(28, 38, 14, 1);
  g.drawImage(spr, 35 - ANGLER_W / 2, 38 - ANGLER_FEET);
  if (look.buddy !== 'none') {
    const b = buddySprite(look.buddy, (t % 4.3) < 0.14);
    g.drawImage(b, 16 - Math.round(b.width / 2), 39 - b.height + (Math.floor(t * 1.6) % 2));
  }
}

// ============================================================= fish gifts ==
// A Gift button on fish in your bucket and tank, once you're logged in.
// (LeBron stays with you forever.)
function giftFishButton(c) {
  if (typeof Online === 'undefined' || !Online.loggedIn() || isUnsellable(c)) return '';
  return `<button class="btn plain" data-giftfish="${c.uid}" aria-label="Gift your ${FISH_BY_ID[c.id].name} to a friend">Gift</button>`;
}

let giftFish = null;  // { uid, from: 'modal-bucket' | 'modal-tank' }

async function openGiftFish(uid, from) {
  const c = [...save.bucket, ...allTankFish()].find(x => x.uid === uid);
  if (!c) return;
  giftFish = { uid, from };
  renderGiftFish(c, true);
  openModal('modal-giftfish');
  Sound.sfx.open();
  await Online.loadFriends();
  if (openId === 'modal-giftfish' && giftFish && giftFish.uid === uid) renderGiftFish(c, false);
}

function renderGiftFish(c, loading, error = '', busy = false) {
  const sp = FISH_BY_ID[c.id];
  const names = Online.friendNames();
  const pick = loading ? '<p class="fine">Loading your friends...</p>'
    : !names.length ? '<p>You need a friend to send it to. Add one from the Friends button!</p>'
    : `<form id="giftfish-form" class="gift-form">
        <label>Send to<select name="to">${names.map(n => `<option value="${escapeHTML(n)}">@${escapeHTML(n)}</option>`).join('')}</select></label>
        <label>Note <span class="fine">(optional)</span><input name="note" maxlength="60" placeholder="Thought of you!" /></label>
        <p class="auth-error" role="alert">${escapeHTML(error)}</p>
        <div class="row-actions"><button class="btn gold" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Sending...' : 'Send gift'}</button>
          <button class="btn plain" type="button" data-giftfish-cancel>Cancel</button></div>
      </form>`;
  $('#giftfish-body').innerHTML = `
    <div class="giftfish-card"><img src="${fishDataUrl(sp)}" alt="" />
      <div><div class="fname">${sp.name}</div>
        <div class="fmeta">${c.size} cm · <span class="stars" aria-label="${c.stars} of 3 stars">${starText(c.stars)}</span> · ${RARITY[sp.rarity].label} · worth ${coinHTML(c.value)}</div></div></div>
    ${pick}`;
}

function backFromGiftFish() {
  const from = giftFish && giftFish.from;
  giftFish = null;
  forceClose();
  if (from === 'modal-bucket') openBucket();
  else if (from === 'modal-tank') openTank(null, shownTankUid, tankFromHome);
}

$('#giftfish-body').addEventListener('submit', async e => {
  e.preventDefault();
  if (!giftFish) return;
  const c = [...save.bucket, ...allTankFish()].find(x => x.uid === giftFish.uid);
  if (!c) return;
  const f = Object.fromEntries(new FormData(e.target).entries());
  renderGiftFish(c, false, '', true);
  const r = await Online.sendFishGift(c.uid, f.to, (f.note || '').trim());
  if (!r.ok) { renderGiftFish(c, false, r.message); return; }
  toast(`Your ${FISH_BY_ID[c.id].name} is on its way to @${f.to}!`);
  Sound.sfx.coin();
  backFromGiftFish();
});
$('#giftfish-body').addEventListener('click', e => { if (e.target.closest('[data-giftfish-cancel]')) backFromGiftFish(); });

// ================================================================= bucket ==
function openBucket() {
  renderBucket();
  openModal('modal-bucket');
  Sound.sfx.open();
}

function renderBucket() {
  const sellable = save.bucket.filter(c => !isUnsellable(c));
  const total = sellable.reduce((sum, c) => sum + c.value, 0);
  $('#bucket-h').textContent = BUCKETS[save.bucketLvl].name;
  $('#bucket-sub').innerHTML = `${save.bucket.length} / ${bucketCap()} fish · worth ${coinHTML(total)}`;
  const sellAll = $('#btn-bucket-sell-all');
  sellAll.disabled = !sellable.length;
  sellAll.innerHTML = sellable.length ? `Sell all for ${coinHTML(total)}` : 'Sell all';
  const list = $('#bucket-list');
  if (!save.bucket.length) {
    list.innerHTML = '<li class="empty" style="display:block">Your bucket is empty. Go catch something!</li>';
    return;
  }
  list.innerHTML = save.bucket.slice().reverse().map(c => {
    const sp = FISH_BY_ID[c.id];
    return `<li>
      <img src="${fishDataUrl(sp)}" alt="" />
      <div><div class="fname">${sp.name}</div>
        <div class="fmeta">${c.size} cm · <span class="stars" aria-label="${c.stars} of 3 stars">${starText(c.stars)}</span> · ${RARITY[sp.rarity].label}</div></div>
      <div class="row-actions">
        <button class="btn mint" data-totank="${c.uid}" ${tankHasRoom(c) ? '' : 'disabled'} aria-label="Move ${sp.name} to the tank">Tank</button>
        ${giftFishButton(c)}
        ${sp.unsellable ? '<span class="priceless">Priceless</span>'
          : `<button class="btn gold" data-sell="${c.uid}" aria-label="Sell ${sp.name} for ${c.value} coins">${coinHTML(c.value)}</button>`}
      </div>
    </li>`;
  }).join('');
}

$('#bucket-list').addEventListener('click', e => {
  const gf = e.target.closest('[data-giftfish]');
  if (gf) { openGiftFish(Number(gf.dataset.giftfish), 'modal-bucket'); return; }
  const t = e.target.closest('[data-totank]');
  if (t) {
    if (moveToTank(Number(t.dataset.totank))) toast('Moved to the tank!');
    renderBucket();
    return;
  }
  const b = e.target.closest('[data-sell]');
  if (!b) return;
  sellFish(Number(b.dataset.sell));
  renderBucket();
  const next = $('#bucket-list [data-sell]');
  (next || $('#modal-bucket .close-btn')).focus({ preventScroll: true });
});

$('#btn-bucket-sell-all').addEventListener('click', () => {
  sellAllFromBucket();
  renderBucket();
  $('#modal-bucket .close-btn').focus({ preventScroll: true });
});
$('#btn-bucket').addEventListener('click', openBucket);

// ================================================================= charms ==
// Enchantments: a little bottle in each one's colour.
const CHARM_ROWS = [
  '...kkkk...',
  '...kcck...',
  '....kk....',
  '...kggk...',
  '..kgggwk..',
  '.kggggwgk.',
  '.kgwggggk.',
  '.kggggggk.',
  '..kggggk..',
  '...kkkk...',
];
const charmSprite = id => spriteDataUrl('charm:' + id, () =>
  mapCanvas(CHARM_ROWS, { k: OUTLINE, c: '#b07a50', g: ENCHANT_BY_ID[id].color, w: '#ffffff' }));

const clock = secs => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
const charmEffect = e => [e.luck ? `Luck +${Math.round(e.luck * 100)}` : '', e.net ? `Net +${e.net}` : ''].filter(Boolean).join(' · ');

// The HUD: a Charms button once you've found one, and a timer while one works.
function renderBoosts() {
  const have = Object.keys(save.enchants).length > 0;
  $('#btn-charms').hidden = !have && !save.boosts.length;
  const total = Object.values(save.enchants).reduce((a, b) => a + b, 0);
  $('#btn-charms').textContent = total ? `Charms (${total})` : 'Charms';
  const pill = $('#boost-pill');
  pill.hidden = !save.boosts.length;
  if (save.boosts.length) {
    const luck = boostSum('luck'), net = boostSum('net');
    const soonest = Math.min(...save.boosts.map(b => b.left));
    pill.textContent = `${[luck ? `Luck +${Math.round(luck * 100)}` : '', net ? `Net +${net}` : ''].filter(Boolean).join(' ')} · ${clock(soonest)}`;
  }
  if (openId === 'modal-charms') updateCharmTimers();
}

function openCharms() {
  renderCharms();
  openModal('modal-charms');
  Sound.sfx.open();
}

function renderCharms() {
  const rows = ENCHANTS.map(e => {
    const n = save.enchants[e.id] || 0;
    const running = save.boosts.find(b => b.id === e.id);
    if (!n && !running) return '';
    return `<li>
      <img src="${charmSprite(e.id)}" alt="" />
      <div><div class="fname">${e.name}${n ? ` <span class="charm-count">x${n}</span>` : ''}</div>
        <div class="fmeta">${charmEffect(e)} for ${clock(e.secs)}. ${e.blurb}</div>
        <div class="fmeta charm-timer" data-timer="${e.id}">${running ? `Working: ${clock(running.left)} left` : ''}</div></div>
      ${n ? `<button class="btn mint" data-usecharm="${e.id}">${running ? 'Add time' : 'Use'}</button>` : '<span class="priceless">In use</span>'}
    </li>`;
  }).join('');
  $('#charm-list').innerHTML = rows || '<li class="empty" style="display:block">No charms yet. Keep fishing: they turn up tangled on the line now and then.</li>';
}

function updateCharmTimers() {
  for (const el of $$('#charm-list [data-timer]')) {
    const running = save.boosts.find(b => b.id === el.dataset.timer);
    el.textContent = running ? `Working: ${clock(running.left)} left` : '';
  }
}

$('#charm-list').addEventListener('click', e => {
  const b = e.target.closest('[data-usecharm]');
  if (!b) return;
  useEnchant(b.dataset.usecharm);
  renderCharms();
  const next = $('#charm-list [data-usecharm]');
  (next || $('#modal-charms .close-btn')).focus({ preventScroll: true });
});
$('#btn-charms').addEventListener('click', openCharms);
$('#boost-pill').addEventListener('click', openCharms);

// ================================================================ fishdex ==
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary', 'goat', 'junk'];

function openDex() {
  renderDex();
  openModal('modal-dex');
  Sound.sfx.open();
}

let dexTab = 'all';

function renderDex() {
  $('#dex-tabs').innerHTML = [{ id: 'all', name: 'All' }, ...LOCATIONS].map(l =>
    `<button role="tab" data-dextab="${l.id}" aria-selected="${l.id === dexTab}">${l.id === 'all' || save.unlocked.includes(l.id) ? l.name : '???'}</button>`).join('');
  const found = FISH.filter(f => save.dex[f.id]).length;
  const catches = `${save.stats.caught} catch${save.stats.caught === 1 ? '' : 'es'}`;
  $('#dex-progress').textContent = `${found}/${FISH.length}`;
  $('#dex-stats').textContent = found === FISH.length
    ? `You found every single one. The pond is proud of you. (${catches}, ${save.stats.earned} coins earned)`
    : `${catches} so far · ${save.stats.earned} coins earned. Silhouettes show what's still out there, and when it swims.`;
  const phaseName = id => PHASES.find(p => p.id === id).name;
  const shown = dexTab === 'all' ? FISH : FISH.filter(f => fishWhere(f).includes(dexTab));
  const sorted = shown.slice().sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  $('#dex-grid').innerHTML = sorted.map(sp => {
    const d = save.dex[sp.id];
    const r = RARITY[sp.rarity];
    const places = fishWhere(sp).length === LOCATIONS.length ? '<span class="chip place">Everywhere</span>'
      : fishWhere(sp).map(id => `<span class="chip place">${save.unlocked.includes(id) ? LOCATIONS.find(l => l.id === id).name : '???'}</span>`).join('');
    const chips = places + (sp.phases.length === 4 ? '<span class="chip">Any time</span>'
      : sp.phases.map(p => `<span class="chip">${phaseName(p)}</span>`).join(''));
    if (!d) {
      return `<div class="dex-card unknown" style="border-top-color:${r.color}">
        <img src="${fishDataUrl(sp, true)}" alt="Undiscovered fish silhouette" />
        <span class="dname">???</span><span class="dmeta">${r.label}</span><div class="chips">${chips}</div></div>`;
    }
    return `<div class="dex-card" style="border-top-color:${r.color}">
      <img src="${fishDataUrl(sp)}" alt="${sp.name}" />
      <span class="dname">${sp.name}</span>
      <span class="dmeta">${r.label} · best ${d.best} cm · caught ×${d.count}</span>
      <span class="dblurb">${sp.blurb}</span>
      <div class="chips">${chips}</div></div>`;
  }).join('');
}

$('#dex-tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-dextab]');
  if (!b) return;
  dexTab = b.dataset.dextab;
  Sound.sfx.click();
  renderDex();
});

// ============================================================== aquarium ==
const tankSwimmers = new Map();
let tankLabel = null;

// view: null for one of your own tanks (shownTankUid says which), or
// { owner, name, fish, decor } for a friend's (read-only)
let tankView = null, shownTankUid = null, tankFromHome = false;
const shownTank = () => findTank(shownTankUid) || mainTank();
const tankFish = () => (tankView ? tankView.fish.filter(c => c && FISH_BY_ID[c.id]) : shownTank().fish);

function openTank(view = null, uid = null, fromHome = false) {
  const key = view ? `${view.owner}:${view.uid}` : `me:${uid || save.mainTank}`;
  if (key !== openTank.lastKey) tankSwimmers.clear();
  openTank.lastKey = key;
  tankView = view;
  if (!view) shownTankUid = uid || save.mainTank;
  tankFromHome = fromHome;
  decorEdit.on = false;
  decorEdit.sel = null;
  renderTank();
  openModal('modal-tank');
  Sound.sfx.open();
}

function renderTank() {
  const fish = tankFish(), t = tankView ? null : shownTank();
  const cap = t ? tankCapOf(t) : 0;
  $('#tank-h').textContent = tankView ? `${tankView.name || 'Tank'} · @${tankView.owner}` : t.name;
  $('#tank-count').textContent = tankView ? `${fish.length} fish` : `${fish.length}/${cap} fish`;
  // tools: rename, main tank, upgrade (your own tanks only)
  $('#tank-tools').hidden = !!tankView && !tankFromHome;
  for (const id of ['#btn-tank-rename', '#btn-tank-main', '#btn-tank-upgrade']) $(id).hidden = !!tankView;
  $('#btn-tank-home').hidden = !tankFromHome;
  if (t) {
    const isMain = t.uid === save.mainTank;
    $('#tank-main-tag').hidden = !isMain || save.tanks.length < 2;
    $('#btn-tank-main').hidden = isMain;
    const next = TANKS[t.lvl + 1];
    const up = $('#btn-tank-upgrade');
    up.hidden = !next;
    if (next) {
      up.innerHTML = `Upgrade to ${next.cap} fish · ${coinHTML(next.price)}`;
      up.disabled = save.coins < next.price;
    }
  } else $('#tank-main-tag').hidden = true;
  $('#modal-tank .tank-hint').textContent = tankView ? 'Tap a fish to say hi. Just looking: these belong to your friend!'
    : fish.length > cap ? `Over capacity! Sell ${fish.length - cap} to make room for new fish.`
    : save.tanks.length > 1 && t.uid === save.mainTank ? 'Tap a fish to say hi. New catches go in this tank.'
    : 'Tap a fish to say hi.';
  const sellable = tankView ? [] : fish.filter(c => !isUnsellable(c));
  const total = sellable.reduce((sum, c) => sum + c.value, 0);
  const sellAll = $('#btn-sell-all');
  sellAll.hidden = !!tankView || decorEdit.on;
  if (tankView) decorEdit.on = false;
  $('#btn-decorate').hidden = !!tankView;
  $('#btn-decorate').textContent = decorEdit.on ? 'Done' : 'Decorate';
  $('#btn-decorate').setAttribute('aria-pressed', String(decorEdit.on));
  $('#tank-canvas').classList.toggle('editing', decorEdit.on);
  $('#tank-list').hidden = decorEdit.on;
  if (decorEdit.on) $('#modal-tank .tank-hint').textContent = 'Drag props to move them. Tap one to flip it or put it away.';
  renderDecorPanel();
  sellAll.disabled = !sellable.length;
  sellAll.innerHTML = sellable.length ? `Sell all for ${coinHTML(total)}` : 'Sell all';
  const list = $('#tank-list');
  list.innerHTML = fish.length ? fish.slice().reverse().map(c => {
    const sp = FISH_BY_ID[c.id];
    return `<li>
      <img src="${fishDataUrl(sp)}" alt="" />
      <div><div class="fname">${sp.name}</div>
        <div class="fmeta">${c.size} cm · <span class="stars" aria-label="${c.stars} of 3 stars">${starText(c.stars)}</span> · ${RARITY[sp.rarity].label}</div></div>
      ${tankView ? '' : sp.unsellable ? '<span class="priceless">Here forever</span>'
        : `<span class="row-actions">${giftFishButton(c)}<button class="btn gold" data-tanksell="${c.uid}" aria-label="Sell ${sp.name} for ${c.value} coins">Sell ${coinHTML(c.value)}</button></span>`}
    </li>`;
  }).join('') : `<li class="empty" style="display:block">${tankView ? 'This tank is empty.' : t.uid === save.mainTank ? 'This tank is empty. Tap "Tank" on a catch to keep it here.' : 'This tank is empty. Make it your main tank to fill it with new catches.'}</li>`;

  // keep the swimmers in sync with what's in the tank
  const uids = new Set(fish.map(c => c.uid));
  for (const uid of tankSwimmers.keys()) if (!uids.has(uid)) tankSwimmers.delete(uid);
  for (const c of fish) {
    if (tankSwimmers.has(c.uid)) continue;
    const sp = FISH_BY_ID[c.id];
    const spr = fishSprite(sp);
    const bottom = !!sp.bottom;
    const y = bottom ? TANK_SAND - spr.height / 2 + 2 : rand(20, TANK_SAND - 16);
    tankSwimmers.set(c.uid, { sp, x: rand(20, TANK_W - 20), y, tx: rand(20, TANK_W - 20), ty: y, dir: 1, t: rand(0, 6), wait: 0, bottom });
  }
}

$('#tank-list').addEventListener('click', e => {
  const gf = e.target.closest('[data-giftfish]');
  if (gf) { openGiftFish(Number(gf.dataset.giftfish), 'modal-tank'); return; }
  const b = e.target.closest('[data-tanksell]');
  if (!b) return;
  const uid = Number(b.dataset.tanksell);
  const c = shownTank().fish.find(x => x.uid === uid);
  if (c && ['rare', 'legendary', 'goat'].includes(FISH_BY_ID[c.id].rarity) &&
    !confirm(`Sell your ${FISH_BY_ID[c.id].name}? It's a ${RARITY[FISH_BY_ID[c.id].rarity].label.toLowerCase()} one!`)) return;
  sellFromTank(uid, shownTank());
  renderTank();
});

$('#btn-sell-all').addEventListener('click', () => {
  const t = shownTank();
  const sellable = t.fish.filter(c => !isUnsellable(c));
  const total = sellable.reduce((sum, c) => sum + c.value, 0);
  if (!confirm(`Sell all ${sellable.length} fish in ${t.name} for ${total} coins?`)) return;
  sellAllFromTank(t);
  renderTank();
  $('#modal-tank .close-btn').focus({ preventScroll: true });
});

$('#btn-tank-rename').addEventListener('click', () => {
  const t = shownTank();
  const name = prompt('Name this tank:', t.name);
  if (name === null) return;
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!clean) return;
  t.name = clean;
  persist();
  renderTank();
});
$('#btn-tank-main').addEventListener('click', () => {
  save.mainTank = shownTank().uid;
  persist();
  toast(`New catches and gifts now go to ${shownTank().name}`);
  refreshHUD();
  renderTank();
});
$('#btn-tank-upgrade').addEventListener('click', () => {
  const t = shownTank(), next = TANKS[t.lvl + 1];
  if (!next || !spend(next.price)) return;
  t.lvl += 1;
  save.home.items.forEach(it => clampRoomItem(it, save.tanks));
  persist();
  toast(`${t.name} now holds ${next.cap} fish!`);
  refreshHUD();
  renderTank();
});
$('#btn-tank-home').addEventListener('click', () => { forceClose(); openHome(homeView); });

const tankPoint = e => {
  const r = $('#tank-canvas').getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * TANK_W, y: ((e.clientY - r.top) / r.height) * TANK_H };
};

$('#tank-canvas').addEventListener('pointerdown', e => {
  const { x, y } = tankPoint(e);
  if (decorEdit.on && !tankView) { decorPointerDown(e, x, y); return; }
  let best = null, bd = 30;
  for (const [uid, f] of tankSwimmers) {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d < bd) { bd = d; best = uid; }
  }
  if (best !== null) {
    const f = tankSwimmers.get(best);
    const c = tankFish().find(x => x.uid === best);
    tankLabel = { uid: best, until: performance.now() + 2500, text: `${f.sp.name} · ${c.size} cm` };
    f.wait = 1.2;
    Sound.sfx.nibble();
  }
});
$('#tank-canvas').addEventListener('pointermove', e => { if (decorEdit.drag) decorDragTo(tankPoint(e)); });
$('#tank-canvas').addEventListener('pointerup', decorDragEnd);
$('#tank-canvas').addEventListener('pointercancel', decorDragEnd);

let lastTankFrame = performance.now();
function drawTank() {
  if (openId !== 'modal-tank') { lastTankFrame = performance.now(); return; }
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTankFrame) / 1000);
  lastTankFrame = now;
  const t = now / 1000;
  const c = $('#tank-canvas'), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };

  // water, light rays, sand
  for (let y = 0; y < TANK_H; y += 3) R(0, y, TANK_W, 3, lerpColor('#8fd8e8', '#2a5a8e', y / TANK_H));
  g.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 4; i++) {
    const x0 = ((i * 70 + t * 5) % (TANK_W + 80)) - 50;
    for (let y = 0; y < TANK_SAND; y += 2) g.fillRect(Math.round(x0 + y * 0.4), y, 10, 2);
  }
  R(0, TANK_SAND, TANK_W, TANK_H - TANK_SAND, '#f0d0a0');
  R(0, TANK_SAND, TANK_W, 1, '#fff0d0');
  for (let x = 4; x < TANK_W; x += 9) R(x, TANK_SAND + 4 + (x % 5), 2, 1, ['#ff9ec4', '#c8b0e0', '#d8b080'][x % 3]);

  // the props, back to front (lower on the sand means nearer the glass)
  const props = tankDecor().filter(d => d.placed);
  const floor = props.filter(d => !DECOR_BY_ID[d.id].float).sort((a, b) => a.y - b.y);
  for (const d of floor) drawDecor(g, d, t);
  for (let i = 0; i < 6; i++) R(120 + Math.sin(t * 3 + i) * 2, TANK_SAND - ((t * 18 + i * 22) % TANK_SAND), 2, 2, 'rgba(255,255,255,0.5)');

  // the fish
  for (const [uid, f] of tankSwimmers) {
    f.t += dt;
    const spr = fishSprite(f.sp);
    if (f.wait > 0) f.wait -= dt;
    else {
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      const speed = f.bottom ? 8 : 10 + f.sp.diff * 2;
      if (d < 2) {
        f.tx = rand(12 + spr.width / 2, TANK_W - 12 - spr.width / 2);
        f.ty = f.bottom ? f.y : rand(14 + spr.height / 2, TANK_SAND - 6 - spr.height / 2);
        f.wait = Math.random() < 0.3 ? rand(0.5, 2) : 0;
      } else {
        f.x += (dx / d) * speed * dt; f.y += (dy / d) * speed * dt;
        if (Math.abs(dx) > 1) f.dir = Math.sign(dx);
      }
    }
    const bob = f.bottom ? (f.sp.id === 'lebron' ? -Math.abs(Math.round(Math.sin(f.t * 8) * 1)) : 0) : Math.round(Math.sin(f.t * 2) * 1);
    g.save();
    g.translate(Math.round(f.x), Math.round(f.y) + bob);
    if (f.dir < 0) g.scale(-1, 1);
    g.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
    g.restore();
    if (!f.bottom && Math.random() < dt * 0.4) f.bubble = { x: f.x + f.dir * spr.width / 2, y: f.y, life: 1.2 };
    if (f.bubble) {
      f.bubble.life -= dt; f.bubble.y -= dt * 12;
      if (f.bubble.life > 0) R(f.bubble.x, f.bubble.y, 1, 1, 'rgba(255,255,255,0.7)'); else f.bubble = null;
    }
  }
  for (const d of props) if (DECOR_BY_ID[d.id].float) drawDecor(g, d, t);
  if (decorEdit.on && !tankView) drawDecorOutlines(g, props);

  // glass shine
  g.fillStyle = 'rgba(255,255,255,0.1)';
  g.fillRect(6, 4, 3, TANK_H - 20); g.fillRect(12, 4, 1, TANK_H - 30);

  // the name tag follows the fish you tapped
  const label = $('#tank-label');
  const f = tankLabel && tankSwimmers.get(tankLabel.uid);
  if (f && now < tankLabel.until) {
    label.hidden = false;
    label.textContent = tankLabel.text;
    label.style.left = `${(f.x / TANK_W) * 100}%`;
    label.style.top = `${((f.y - fishSprite(f.sp).height / 2) / TANK_H) * 100}%`;
  } else {
    label.hidden = true;
  }
}

// ============================================================ tank props ==
// Props are bought in the Shop (Tank tab) and arranged in the Tank's
// decorate mode: drag to move, tap to select, then flip or put away.
const decorEdit = { on: false, sel: null, drag: null };
const tankDecor = () => (tankView ? (tankView.decor || starterDecor()).filter(d => d && DECOR_BY_ID[d.id]).map(d => clampDecor({ ...d, placed: d.placed !== false })) : shownTank().decor);
const placedCount = (t = shownTank()) => t.decor.filter(d => d.placed).length;

// Draws one prop with its bottom-centre at (d.x, d.y).
function drawDecor(g, d, t) {
  const def = DECOR_BY_ID[d.id];
  const bob = def.float ? Math.round(Math.sin(t * 1.3 + d.uid) * 1.5) : 0;
  g.save();
  g.translate(Math.round(d.x), Math.round(d.y) + bob);
  if (d.flip) g.scale(-1, 1);
  const L = -Math.floor(def.w / 2), B = 0;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(L + x, B + y, w, h); };
  const phase = d.uid * 1.7;
  const sway = (yy, h) => Math.round(Math.sin(t * 1.4 + phase + yy * 0.15) * (yy / h) * 3);
  switch (d.id) {
    case 'castle':
      R(4, -28, 22, 28, '#c8b8d8'); R(0, -34, 8, 34, '#b0a0c8'); R(22, -34, 8, 34, '#b0a0c8');
      for (const x of [0, 4, 22, 26]) R(x, -37, 2, 3, '#b0a0c8');
      R(11, -12, 8, 12, '#4a3a5a'); R(12, -13, 6, 1, '#4a3a5a');
      R(2, -26, 3, 3, '#4a3a5a'); R(24, -26, 3, 3, '#4a3a5a');
      R(26, -44, 1, 10, '#6a3a2e'); R(27, -44, 5, 3, '#e0566e');
      break;
    case 'chest':
      R(0, -8, 16, 8, '#a8603e'); R(0, -11, 16, 4, '#c07850'); R(0, -8, 16, 1, '#ffd23f'); R(7, -7, 2, 2, '#ffd23f');
      if (Math.sin(t * 0.8 + phase) > 0.6) for (let i = 0; i < 3; i++) R(4 + i * 4, -13 - ((t * 20 + i * 5) % 12), 2, 2, 'rgba(255,255,255,0.6)');
      break;
    case 'kelp': case 'pinkweed': {
      const h = d.id === 'kelp' ? 34 : 24, col = d.id === 'kelp' ? '#5aa860' : '#e070b0';
      for (let yy = 0; yy < h; yy++) {
        const sw = sway(yy, h);
        R(3 + sw, -yy - 1, 2, 1, col);
        if (yy % 6 === 3) R(3 + sw + (yy % 12 === 3 ? 2 : -2), -yy - 1, 2, 1, col);
      }
      break;
    }
    case 'starfish':
      R(4, -5, 2, 5, '#ff8a6b'); R(0, -3, 10, 2, '#ff8a6b'); R(2, -1, 2, 1, '#ff8a6b'); R(6, -1, 2, 1, '#ff8a6b');
      R(4, -3, 2, 1, '#ffd0b0');
      break;
    case 'coral':
      R(9, -11, 3, 11, '#ff9e80'); R(3, -18, 2, 10, '#ff9e80'); R(3, -9, 7, 2, '#ff9e80');
      R(15, -20, 2, 12, '#ff9e80'); R(11, -10, 6, 2, '#ff9e80'); R(6, -15, 2, 5, '#ff9e80');
      for (const [x, y] of [[3, -19], [15, -21], [6, -16], [9, -12]]) R(x, y, 2, 1, '#ffd0b8');
      break;
    case 'clam': {
      const open = Math.sin(t * 0.7 + phase) > 0.2;
      R(0, -4, 16, 4, '#e8c8e8'); for (let x = 2; x < 16; x += 4) R(x, -4, 1, 4, '#c8a0c8');
      if (open) { R(6, -7, 4, 3, '#fff8f0'); R(7, -7, 1, 1, '#ffffff'); }
      R(1, open ? -10 : -6, 14, 2, '#d8b0d8'); R(0, open ? -9 : -5, 16, 1, '#c8a0c8');
      break;
    }
    case 'sign':
      R(9, -8, 2, 8, '#8a5a3a'); R(0, -16, 20, 9, '#c89a6a'); R(0, -16, 20, 1, '#e0b888');
      R(3, -13, 14, 1, '#6a3a2e'); R(3, -11, 9, 1, '#6a3a2e'); R(14, -11, 3, 1, '#e0566e');
      break;
    case 'arch':
      R(0, -20, 34, 6, '#8a8098'); R(0, -14, 8, 14, '#8a8098'); R(26, -14, 8, 14, '#8a8098');
      R(2, -20, 30, 1, '#a8a0b8'); R(1, -14, 1, 12, '#a8a0b8'); R(27, -14, 1, 12, '#a8a0b8');
      R(5, -21, 4, 1, '#5aa860'); R(20, -21, 6, 1, '#5aa860'); R(0, -3, 3, 3, '#5aa860');
      break;
    case 'duck':
      R(1, -6, 12, 6, '#ffd23f'); R(8, -11, 5, 5, '#ffd23f'); R(13, -8, 2, 2, '#ff8a3a');
      R(10, -10, 1, 1, '#2a1a2e'); R(3, -5, 5, 2, '#f0b020'); R(1, -6, 12, 1, '#fff3a0');
      break;
    case 'diver':
      R(2, -18, 8, 8, '#c8a050'); R(4, -16, 4, 4, '#8fd8e8'); R(3, -10, 6, 7, '#ff8a6b');
      R(3, -3, 2, 3, '#4a3a5a'); R(7, -3, 2, 3, '#4a3a5a'); R(1, -9, 2, 4, '#ff8a6b'); R(9, -9, 2, 4, '#ff8a6b');
      for (let i = 0; i < 2; i++) R(6 + Math.round(Math.sin(t * 3 + i) * 1.5), -20 - ((t * 14 + i * 9) % 18), 2, 2, 'rgba(255,255,255,0.6)');
      break;
    case 'jelly': {
      const glow = 0.25 + 0.15 * Math.sin(t * 2 + phase);
      g.fillStyle = `rgba(255,190,230,${glow.toFixed(2)})`; g.fillRect(L - 3, -19, 18, 20);
      R(1, -16, 10, 6, '#ffaadc'); R(3, -17, 6, 1, '#ffaadc'); R(3, -15, 2, 2, '#ffe0f0');
      for (let i = 0; i < 4; i++) for (let yy = 0; yy < 8; yy++) R(2 + i * 2 + Math.round(Math.sin(t * 3 + i + yy * 0.6) * 0.8), -10 + yy, 1, 1, '#ff88c8');
      break;
    }
    case 'pineapple':
      R(2, -20, 14, 20, '#ffb840'); for (let y = -18; y < 0; y += 4) for (let x = 3; x < 16; x += 4) R(x + ((y / 4) % 2 ? 2 : 0), y, 1, 1, '#e09020');
      R(5, -28, 2, 8, '#5aa860'); R(8, -27, 2, 7, '#7ac070'); R(11, -28, 2, 8, '#5aa860');
      R(7, -7, 4, 7, '#8a5a3a'); R(4, -15, 3, 3, '#8fd8e8'); R(11, -15, 3, 3, '#8fd8e8');
      break;
    case 'volcano': {
      for (let r = 0; r < 15; r++) { const half = Math.round(12 - r * 0.55); R(12 - half, -1 - r, half * 2, 1, r > 12 ? '#6a5a5a' : '#8a6a5a'); }
      R(9, -16, 6, 1, '#ff8a6b');
      if (Math.sin(t * 0.9 + phase) > 0) for (let i = 0; i < 4; i++) R(11 + Math.round(Math.sin(t * 5 + i * 2) * 2), -18 - ((t * 24 + i * 8) % 30), 2, 2, 'rgba(255,255,255,0.65)');
      break;
    }
    case 'wreck':
      R(2, -10, 42, 10, '#8a5a3a'); R(0, -12, 46, 2, '#a8703e'); R(2, -6, 42, 1, '#6a3a2e'); R(2, -3, 42, 1, '#6a3a2e');
      R(22, -24, 2, 12, '#6a3a2e'); R(24, -22, 8, 6, '#e8d8c8'); R(28, -17, 4, 1, '#e8d8c8');
      R(10, -9, 3, 3, '#8fd8e8'); R(32, -9, 3, 3, '#8fd8e8'); R(38, -12, 5, 2, '#5aa860');
      break;
    case 'rainbowcoral': {
      const cols = ['#ff6a7a', '#ffa850', '#ffe070', '#8fe0a0', '#7ab0f0', '#b89cff'];
      [[9, 13, 3], [3, 19, 2], [15, 21, 2], [6, 16, 2], [12, 18, 2], [18, 12, 2]].forEach(([x, h, w], i) => {
        R(x, -h, w, h, cols[i]); R(x, -h - 1, w, 1, '#ffffff');
      });
      R(3, -9, 7, 2, cols[1]); R(11, -10, 7, 2, cols[4]);
      break;
    }
    case 'crystal': {
      const sh = [[2, 14, '#b89cff'], [6, 20, '#7ae0ff'], [10, 16, '#ffb0e0'], [13, 11, '#b89cff']];
      for (const [x, h, col] of sh) { R(x, -h, 4, h, col); R(x + 1, -h - 1, 2, 1, col); R(x, -h, 1, h, '#ffffff'); }
      R(0, -3, 18, 3, '#8a8098');
      if (Math.sin(t * 2.5 + phase) > 0.6) R(7, -22, 1, 1, '#ffffff');
      break;
    }
    case 'goldcastle': {
      const gd = '#ffd23f', gs = '#e0a020';
      R(4, -28, 22, 28, gd); R(0, -34, 8, 34, gs); R(22, -34, 8, 34, gs);
      for (const x of [0, 4, 22, 26]) R(x, -37, 2, 3, gs);
      R(11, -12, 8, 12, '#6a3a2e'); R(12, -13, 6, 1, '#6a3a2e');
      R(2, -26, 3, 3, '#7ae0ff'); R(24, -26, 3, 3, '#ff6a7a'); R(13, -22, 4, 3, '#b89cff');
      R(26, -44, 1, 10, '#6a3a2e'); R(27, -44, 5, 3, '#b89cff');
      if (Math.sin(t * 3 + phase) > 0.7) R(8, -30, 1, 1, '#ffffff');
      break;
    }
    case 'hoard': {
      R(8, -9, 14, 9, '#a8603e'); R(8, -12, 14, 3, '#c07850'); R(8, -9, 14, 1, '#ffd23f');
      R(0, -4, 8, 4, '#ffd23f'); R(1, -6, 6, 2, '#ffd23f'); R(22, -5, 8, 5, '#ffd23f'); R(23, -7, 5, 2, '#ffd23f');
      R(9, -14, 12, 2, '#ffd23f'); R(11, -15, 8, 1, '#ffd23f');
      R(3, -5, 2, 2, '#7ae0ff'); R(25, -6, 2, 2, '#ff6a7a'); R(14, -15, 2, 2, '#8fe0a0');
      if (Math.sin(t * 4 + phase) > 0.5) R(17, -17, 1, 1, '#ffffff');
      break;
    }
    case 'statue': {
      R(2, -8, 16, 8, '#c8c0d0'); R(2, -8, 16, 1, '#e8e0f0'); R(4, -10, 12, 2, '#b0a8c0');
      // a golden fish balancing on its tail
      R(8, -14, 4, 4, '#e0a020'); R(6, -15, 8, 1, '#e0a020');
      R(6, -28, 8, 13, '#ffd23f'); R(5, -26, 1, 9, '#ffd23f'); R(14, -26, 1, 9, '#ffd23f'); R(7, -30, 6, 2, '#ffd23f');
      R(8, -26, 2, 2, OUTLINE); R(11, -21, 2, 1, '#e0a020'); R(7, -27, 1, 9, '#fff3a0');
      if (Math.sin(t * 3 + phase) > 0.6) R(13, -31, 1, 1, '#ffffff');
      break;
    }
    case 'trophy':
      R(2, -20, 10, 8, '#ffd23f'); R(0, -19, 2, 4, '#ffd23f'); R(12, -19, 2, 4, '#ffd23f');
      R(6, -12, 2, 5, '#e0b020'); R(3, -7, 8, 2, '#e0b020'); R(2, -5, 10, 5, '#8a5a3a');
      R(4, -19, 1, 5, '#fff3a0'); R(4, -3, 6, 1, '#ffd23f');
      if (Math.sin(t * 2 + phase) > 0.7) R(11, -22, 1, 1, '#ffffff');
      break;
  }
  g.restore();
}

function decorSprite(id) {
  return spriteDataUrl('decor:' + id, () => {
    const def = DECOR_BY_ID[id];
    const c = document.createElement('canvas');
    c.width = def.w + 8; c.height = def.h + 4;
    drawDecor(c.getContext('2d'), { uid: 0, id, x: Math.floor(c.width / 2), y: c.height - 2, flip: false }, 0);
    return c;
  });
}

// the prop's box on the canvas, for tapping and outlines
const decorBox = d => { const def = DECOR_BY_ID[d.id]; return { x: d.x - def.w / 2, y: d.y - def.h, w: def.w, h: def.h }; };

function drawDecorOutlines(g, props) {
  for (const d of props) {
    const b = decorBox(d), sel = d.uid === decorEdit.sel;
    g.strokeStyle = sel ? '#ffd27a' : 'rgba(255,255,255,0.35)';
    g.lineWidth = 1;
    g.setLineDash(sel ? [2, 1] : [1, 2]);
    g.strokeRect(Math.round(b.x) - 1.5, Math.round(b.y) - 1.5, b.w + 3, b.h + 3);
  }
  g.setLineDash([]);
}

function decorPointerDown(e, x, y) {
  // topmost first: floaters, then floor props nearest the glass
  const props = shownTank().decor.filter(d => d.placed)
    .sort((a, b) => (DECOR_BY_ID[b.id].float ? 1 : 0) - (DECOR_BY_ID[a.id].float ? 1 : 0) || b.y - a.y);
  const hit = props.find(d => { const b = decorBox(d); return x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3; });
  decorEdit.sel = hit ? hit.uid : null;
  if (hit) {
    decorEdit.drag = { uid: hit.uid, dx: x - hit.x, dy: y - hit.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    Sound.sfx.click();
  }
  renderDecorPanel();
}

function decorDragTo({ x, y }) {
  const d = shownTank().decor.find(p => p.uid === decorEdit.drag.uid);
  if (!d) return;
  d.x = x - decorEdit.drag.dx;
  d.y = y - decorEdit.drag.dy;
  clampDecor(d);
  decorEdit.drag.moved = true;
}

function decorDragEnd() {
  if (!decorEdit.drag) return;
  if (decorEdit.drag.moved) persist();
  decorEdit.drag = null;
}

function renderDecorPanel() {
  const panel = $('#decor-panel');
  panel.hidden = !decorEdit.on || !!tankView;
  if (panel.hidden) return;
  const sel = shownTank().decor.find(d => d.uid === decorEdit.sel && d.placed);
  $('#decor-selected').innerHTML = sel
    ? `<b>${DECOR_BY_ID[sel.id].name}</b>
       <span class="row-actions">
         <button class="btn plain" data-decor="flip">Flip</button>
         <button class="btn plain" data-decor="store">Put away</button>
       </span>
       <span class="fine kbd-only">Arrow keys nudge it too.</span>`
    : `<span class="fine">${placedCount()}/${MAX_DECOR} props in the tank.</span>
       <button class="btn gold" data-decor="shop">Get more props</button>`;
  const stored = shownTank().decor.filter(d => !d.placed);
  const full = placedCount() >= MAX_DECOR;
  $('#decor-tray').innerHTML = stored.length
    ? `<h3>Put away</h3><div class="tray-items">${stored.map(d => `
        <button class="tray-item" data-place="${d.uid}" ${full ? 'disabled' : ''} aria-label="Place the ${DECOR_BY_ID[d.id].name}">
          <img src="${decorSprite(d.id)}" alt="" /><span>${DECOR_BY_ID[d.id].name}</span></button>`).join('')}</div>
       ${full ? `<p class="fine">The tank holds ${MAX_DECOR} props. Put one away to make room.</p>` : ''}`
    : '';
}

$('#btn-decorate').addEventListener('click', () => {
  decorEdit.on = !decorEdit.on;
  decorEdit.sel = null;
  decorEdit.drag = null;
  Sound.sfx.click();
  renderTank();
});

$('#decor-panel').addEventListener('click', e => {
  const act = e.target.closest('[data-decor]');
  if (act) {
    const sel = shownTank().decor.find(d => d.uid === decorEdit.sel);
    if (act.dataset.decor === 'shop') { forceClose(); openShop(false, 'decor'); return; }
    if (sel && act.dataset.decor === 'flip') sel.flip = !sel.flip;
    if (sel && act.dataset.decor === 'store') { sel.placed = false; decorEdit.sel = null; }
    Sound.sfx.click();
    persist();
    renderDecorPanel();
    return;
  }
  const place = e.target.closest('[data-place]');
  if (place && placedCount() < MAX_DECOR) {
    const d = shownTank().decor.find(p => p.uid === Number(place.dataset.place));
    if (!d) return;
    d.placed = true;
    d.x = TANK_W / 2;
    d.y = DECOR_BY_ID[d.id].float ? TANK_SAND / 2 : TANK_H - 6;
    clampDecor(d);
    decorEdit.sel = d.uid;
    Sound.sfx.buy();
    persist();
    renderDecorPanel();
  }
});

document.addEventListener('keydown', e => {
  if (openId !== 'modal-tank' || !decorEdit.on || isTyping(e.target)) return;
  const d = shownTank().decor.find(p => p.uid === decorEdit.sel && p.placed);
  if (!d) return;
  const step = e.shiftKey ? 8 : 2;
  const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (move) {
    e.preventDefault();
    d.x += move[0]; d.y += move[1];
    clampDecor(d);
    persist();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    d.placed = false;
    decorEdit.sel = null;
    persist();
    renderDecorPanel();
  }
});

// ---- the Shop's Tank tab
function decorShopTank() { return findTank(shop.decorTank) || mainTank(); }

function renderDecorShop() {
  const t = decorShopTank();
  $('#decor-tank-pick').hidden = save.tanks.length < 2;
  $('#decor-tank-pick select').innerHTML = save.tanks.map(x => `<option value="${x.uid}" ${x.uid === t.uid ? 'selected' : ''}>${escapeHTML(x.name)}</option>`).join('');
  const count = id => t.decor.filter(d => d.id === id).length;
  $('#decor-grid').innerHTML = DECOR.map(def => {
    const n = count(def.id);
    return `<div class="item decor-item">
      <img src="${decorSprite(def.id)}" alt="" />
      <span class="name">${def.name}</span>
      <span class="tag">${def.blurb}</span>
      ${n ? `<span class="tag">${n} in ${escapeHTML(t.name)}</span>` : ''}
      ${def.price === 0 ? `<button class="btn mint" data-decorbuy="${def.id}">Get free</button>` : buyButton(`data-decorbuy="${def.id}"`, def.price)}
    </div>`;
  }).join('');
}

$('#decor-tank-pick select').addEventListener('change', e => { shop.decorTank = Number(e.target.value); renderDecorShop(); });

$('#decor-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-decorbuy]');
  if (!b) return;
  const def = DECOR_BY_ID[b.dataset.decorbuy];
  const t = decorShopTank();
  if (t.decor.length >= 200) { toast('That\'s a lot of props! Put some away first.'); return; }
  if (def.price > 0 && !spend(def.price)) return;
  if (def.price === 0) Sound.sfx.buy();
  const placed = placedCount(t) < MAX_DECOR;
  const d = clampDecor({ uid: t.nextDecor++, id: def.id, x: rand(def.w, TANK_W - def.w), y: def.float ? rand(20, TANK_SAND - 10) : rand(TANK_SAND, TANK_H - 3), flip: Math.random() < 0.5, placed });
  t.decor.push(d);
  persist();
  toast(placed ? `${def.name} added to ${t.name}!` : `${def.name} is waiting in ${t.name}'s tray`);
  renderDecorShop();
  refreshHUD();
});

// ==================================================================== map ==
function openMap() {
  save.newSpot = false;
  persist();
  refreshHUD();
  renderMap();
  openModal('modal-map');
  Sound.sfx.open();
}

function renderMap() {
  const count = fishCaughtCount();
  $('#map-count').textContent = G.visit ? `@${G.visit.host}'s sea` : `${count} fish caught`;
  const unlocked = worldUnlocked();
  $('#map-list').innerHTML = LOCATIONS.map(loc => {
    const here = loc.id === worldLocationId();
    const open = unlocked.includes(loc.id);
    const hostHere = G.visit && G.visit.hostLocation === loc.id;
    const species = FISH.filter(f => fishWhere(f).includes(loc.id) && f.rarity !== 'junk');
    const found = species.filter(f => save.dex[f.id]).length;
    let action;
    if (here) action = '<button class="btn plain" disabled>You are here</button>';
    else if (open) action = `<button class="btn mint" data-sail="${loc.id}" ${canTravel() ? '' : 'disabled'}>${canTravel() ? 'Sail here' : 'Finish reeling first'}</button>`;
    else if (G.visit) action = `<span class="desc">@${escapeHTML(G.visit.host)} hasn't found this spot yet</span>`;
    else {
      const pct = Math.round((count / loc.need) * 100);
      action = `<div class="progress" role="progressbar" aria-valuenow="${count}" aria-valuemax="${loc.need}"><span style="width:${pct}%"></span></div>
        <span class="desc">Catch ${loc.need - count} more fish to unlock</span>`;
    }
    return `<li class="${here ? 'here' : ''} ${open ? '' : 'locked'}">
      <b>${open ? loc.name : '???'}${hostHere ? ` <span class="host-here">@${escapeHTML(G.visit.host)} is here</span>` : ''}</b>
      <span class="desc">${open ? loc.blurb : 'Uncharted waters. Rumour says strange fish live out there.'}</span>
      ${open ? `<span class="desc">Fishdex: ${found}/${species.length} found here</span>` : ''}
      ${action}</li>`;
  }).join('');
}

$('#map-list').addEventListener('click', e => {
  const b = e.target.closest('[data-sail]');
  if (!b) return;
  forceClose();
  sailTo(b.dataset.sail);
});

// A little hand-drawn sea chart, redrawn every frame while it's open.
function drawMap() {
  if (openId !== 'modal-map') return;
  const c = $('#map-canvas'), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const t = performance.now() / 1000;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  for (let y = 0; y < 100; y += 4) R(0, y, 160, 4, lerpColor('#5ab0b8', '#3a6a9a', y / 100));
  for (let i = 0; i < 40; i++) {
    const x = (i * 37 + t * 3) % 170 - 5, y = (i * 23) % 96 + 2;
    R(x, y, 3, 1, 'rgba(255,255,255,0.25)');
  }
  R(0, 0, 160, 1, '#2a1a2e'); R(0, 99, 160, 1, '#2a1a2e');
  // dotted route
  g.fillStyle = 'rgba(255,244,224,0.8)';
  for (let i = 0; i < LOCATIONS.length - 1; i++) {
    const a = LOCATIONS[i].map, b = LOCATIONS[i + 1].map;
    const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 4);
    for (let k = 1; k < n; k++) {
      const x = lerp(a.x, b.x, k / n), y = lerp(a.y, b.y, k / n) + Math.sin(k) * 2;
      if (k % 2) g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  const unlocked = worldUnlocked();
  for (const loc of LOCATIONS) {
    const { x, y } = loc.map;
    const open = unlocked.includes(loc.id);
    const sand = open ? '#f0d0a0' : '#8a90a8', green = open ? ({ dock: '#6aa860', lagoon: '#ff9ec4', cove: '#4fc0a0', bay: '#f4faff', blossom: '#ffc0d8', ember: '#6a4a5a', cloud: '#ffffff' })[loc.id] : '#6a7090';
    ellipse(g, x, y + 1, 14, 6, '#2a1a2e');
    ellipse(g, x, y, 13, 5, sand);
    ellipse(g, x - 2, y - 1, 8, 3, green);
    if (!open) {
      for (let i = 0; i < 5; i++) ellipse(g, x - 10 + i * 5, y - 3 + Math.sin(t + i) * 1, 5, 3, 'rgba(240,236,250,0.85)');
      R(x - 1, y - 6, 3, 4, '#2a1a2e'); R(x, y - 5, 1, 1, '#ffd27a'); R(x, y - 3, 1, 1, '#ffd27a');
    } else if (loc.id === 'dock') {
      R(x + 5, y - 9, 2, 8, '#fff4e0'); R(x + 5, y - 7, 2, 2, '#e0566e'); R(x + 5, y - 10, 2, 1, '#ffd27a');
    } else if (loc.id === 'lagoon') {
      R(x + 3, y - 6, 1, 5, '#6a4a3a'); ellipse(g, x + 3, y - 7, 5, 2, '#8ac070');
    } else if (loc.id === 'cove') {
      R(x + 4, y - 8, 1, 7, '#8a5a3a'); R(x + 1, y - 9, 7, 1, '#4f9a5a'); R(x + 2, y - 8, 1, 1, '#4f9a5a'); R(x + 6, y - 8, 1, 1, '#4f9a5a');
    } else if (loc.id === 'bay') {
      R(x + 2, y - 6, 5, 5, '#e8f4ff'); R(x + 3, y - 8, 3, 2, '#e8f4ff'); R(x + 5, y - 6, 2, 5, '#b0c8ec');
    } else if (loc.id === 'blossom') {
      R(x + 3, y - 5, 1, 4, '#5a3a3a'); ellipse(g, x + 3, y - 7, 4, 2, '#ffb0cc'); R(x - 6, y - 4, 1, 3, '#e0404a'); R(x - 2, y - 4, 1, 3, '#e0404a'); R(x - 7, y - 5, 7, 1, '#e0404a');
    } else if (loc.id === 'ember') {
      for (let i = 0; i < 7; i++) R(x - 1 - i, y - 9 + i, 3 + i * 2, 1, '#5a3a4a');
      R(x - 1, y - 10, 3, 1, '#ff7a3c'); R(x + Math.round(Math.sin(t) * 2), y - 13 - Math.round((t * 3) % 4), 2, 2, 'rgba(220,210,230,0.8)');
    } else if (loc.id === 'cloud') {
      ellipse(g, x + 3, y - 9 + Math.round(Math.sin(t * 2)), 4, 1, '#8ad07a'); R(x + 1, y - 8 + Math.round(Math.sin(t * 2)), 4, 2, '#a89ab8');
    }
    // while visiting, a gold flag marks where your friend is
    if (G.visit && loc.id === G.visit.hostLocation) {
      R(x + 9, y - 12, 1, 9, '#2a1a2e'); R(x + 10, y - 12, 5, 3, '#ffd23f'); R(x + 10, y - 12, 5, 1, '#fff3a0');
    }
    if (loc.id === worldLocationId()) {
      const bob = Math.round(Math.sin(t * 3));
      R(x - 12, y + 5 + bob, 9, 3, boatColors().hull); R(x - 12, y + 5 + bob, 9, 1, boatColors().trim);
      R(x - 8, y - 2 + bob, 1, 7, '#6a3a2e'); R(x - 7, y - 1 + bob, 3, 4, '#fff4e0');
    }
  }
}

// ============================================================= catch card ==
function showCatchCard(c) {
  const sp = FISH_BY_ID[c.id];
  const r = RARITY[sp.rarity];
  $('#catch-img').src = fishDataUrl(sp);
  $('#catch-img').alt = sp.name;
  $('#catch-new').hidden = !c.isNew;
  $('#catch-rarity').textContent = r.label;
  $('#catch-rarity').style.background = r.color;
  $('#catch-name').textContent = sp.name;
  $('#catch-meta').innerHTML = `${c.size} cm · <span class="stars" aria-label="${c.stars} of 3 stars">${starText(c.stars)}</span>`;
  $('#catch-blurb').textContent = sp.blurb;
  const bonus = G.foundEnchant && ENCHANT_BY_ID[G.foundEnchant];
  $('#catch-bonus').hidden = !bonus;
  if (bonus) $('#catch-bonus').innerHTML = `<img src="${charmSprite(bonus.id)}" alt="" /><span>Something sparkly was tangled on the line: a <b>${bonus.name}</b>! Use it from Charms.</span>`;
  const tank = $('#catch-tank');
  tank.disabled = !tankHasRoom(c);
  tank.textContent = tank.disabled ? 'Tank full' : 'Tank';
  const sell = $('#catch-sell');
  sell.hidden = !!sp.unsellable;
  sell.innerHTML = `Sell ${coinHTML(c.value)}`;
  const bucket = $('#catch-bucket');
  bucket.disabled = !bucketHasRoom();
  bucket.textContent = bucket.disabled ? 'Bucket full' : 'Bucket';
  const first = !bucket.disabled ? bucket : !tank.disabled ? tank : sell;
  for (const b of [bucket, tank, sell, $('#catch-release')]) b.toggleAttribute('data-autofocus', b === first);
  openModal('modal-catch');
}

function resolveCatch(action) {
  forceClose();
  finishCatch(action);
  $('#action-btn').focus({ preventScroll: true });
}

$('#catch-bucket').addEventListener('click', () => resolveCatch('bucket'));
$('#catch-sell').addEventListener('click', () => resolveCatch('sell'));
$('#catch-tank').addEventListener('click', () => resolveCatch('tank'));
$('#catch-release').addEventListener('click', () => resolveCatch('release'));

// ================================================================== input ==
const ACTION_LABELS = {
  idle: 'Cast!', casting: 'Whoosh...', waiting: 'Wait for the dip...',
  bite: 'TAP NOW!', reeling: 'Chase it!', retract: 'Reeling in...', landing: 'Got it!', showing: 'Nice!',
  sailing: 'Sailing...',
};
let lastActionState = null;

function uiTick() {
  if (G.state !== lastActionState) {
    lastActionState = G.state;
    const btn = $('#action-btn');
    btn.textContent = ACTION_LABELS[G.state] || 'Cast!';
    btn.classList.toggle('gold', G.state === 'bite');
    const chasing = G.state === 'reeling';
    btn.hidden = chasing;
    $('#dpad').hidden = !chasing;
    if (!chasing) $$('#dpad button').forEach(b => b.classList.remove('pressed'));
  }
  drawPreview();
  drawBoatPreview();
  drawMap();
  drawTank();
  // home.js loads after this file, and the first frame runs before it does
  if (typeof drawHome === 'function') drawHome();
}

// Converts a pointer position into the 320x180 canvas's own pixels.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

function bindHold(el, aimed) {
  el.addEventListener('pointerdown', e => {
    if (openId || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    Sound.init();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    el.classList.add('pressed');
    if (aimed && G.state === 'idle') { setAim(canvasPoint(e)); press(G.aim); }
    else if (aimed && G.state === 'reeling') G.steer = canvasPoint(e);
    else press();
  });
  const up = () => { el.classList.remove('pressed'); G.steer = null; release(); };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindHold($('#stage'), true);
bindHold($('#action-btn'), false);
$('#stage').addEventListener('pointermove', e => {
  if (openId) return;
  if (G.state === 'reeling' && G.steer) G.steer = canvasPoint(e);
  else if (e.pointerType === 'mouse' && G.state === 'idle') setAim(canvasPoint(e));
});

// On-screen D-pad (shown while chasing): each button holds a direction.
$$('#dpad button').forEach(b => {
  const dir = b.dataset.dir;
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    b.classList.add('pressed');
    G.keys.add(dir);
  });
  const up = () => { b.classList.remove('pressed'); G.keys.delete(dir); };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});

const ARROW_KEYS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
};

const isTyping = t => t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); return; }
  if (openId || isTyping(e.target)) return;
  const dir = ARROW_KEYS[e.code];
  if (dir && (G.state === 'reeling' || G.state === 'bite')) {
    e.preventDefault();
    if (G.state === 'bite') { Sound.init(); press(); release(); }
    G.keys.add(dir);
    return;
  }
  const hudButton = e.target.closest && e.target.closest('button') && e.target.id !== 'action-btn';
  if (e.code === 'Space' || (e.key === 'Enter' && !hudButton)) {
    e.preventDefault();
    if (e.repeat) return;
    Sound.init();
    press();
  }
});
document.addEventListener('keyup', e => {
  if (ARROW_KEYS[e.code]) G.keys.delete(ARROW_KEYS[e.code]);
  if (e.code === 'Space' || e.key === 'Enter') {
    if (!openId && !isTyping(e.target)) e.preventDefault();
    release();
  }
});
window.addEventListener('blur', cancelInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelInput(); writeSave(); }
});
window.addEventListener('pagehide', writeSave);

$('#btn-map').addEventListener('click', openMap);
$('#btn-tank').addEventListener('click', () => openTank(null));
$('#btn-shop').addEventListener('click', () => openShop(false));
$('#btn-dex').addEventListener('click', openDex);
$('#btn-sound').addEventListener('click', () => {
  Sound.init();
  save.muted = !save.muted;
  Sound.setMuted(save.muted);
  $('#btn-sound').setAttribute('aria-pressed', String(!save.muted));
  persist();
});

// ================================================================== boot ==
Sound.setMuted(save.muted);
$('#btn-sound').setAttribute('aria-pressed', String(!save.muted));
refreshHUD();
requestAnimationFrame(frame);
showTitle();
