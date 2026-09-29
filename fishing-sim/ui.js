// Tiny Tides — the HTML side: HUD, menus, shop, bucket, Fishdex, input.

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
  const phase = PHASES.find(p => p.id === G.phaseId);
  $('#phase-pill').textContent = `${currentLoc().name} · ${phase ? phase.name : ''}`;
  $('#btn-map').classList.toggle('glow', !!save.newSpot);
  if (openId === 'modal-shop') renderShop();
  if (openId === 'modal-map') renderMap();
  if (openId === 'modal-bucket') renderBucket();
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
  if (openId === 'modal-catch') { resolveCatch(save.bucket.length < bucketCap() ? 'keep' : 'sell'); return; }
  if (openId === 'modal-title' || (openId === 'modal-shop' && shop.creator)) return;
  $('#' + openId).hidden = true;
  if (openId === 'modal-shop') shop.trial = null;
  openId = null;
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
function showTitle() {
  $('#btn-continue').hidden = !save.started;
  $('#btn-reset').hidden = !save.started;
  $('#btn-new').textContent = save.started ? 'New angler' : 'Start';
  if (save.started) $('#btn-continue').setAttribute('data-autofocus', '');
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
  if (save.started && !confirm('Start a new angler? This erases your coins, fish and outfits.')) return;
  if (save.started) { resetSave(); refreshHUD(); }
  openShop(true);
});

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Erase your save? Coins, fish, outfits and the Fishdex will all be gone.')) return;
  resetSave();
  refreshHUD();
  showTitle();
});

// =================================================================== shop ==
const shop = { tab: 'wardrobe', cat: 'hair', creator: false, trial: null };

function openShop(creator = false) {
  shop.creator = creator;
  shop.trial = null;
  shop.tab = 'wardrobe';
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
  if (shop.tab === 'wardrobe') {
    renderCatTabs();
    renderItems();
    renderTryOn();
  } else {
    renderTackle();
  }
}

$$('#shop-tabs [data-shoptab]').forEach(b => b.addEventListener('click', () => {
  shop.tab = b.dataset.shoptab;
  shop.trial = null;
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

function renderTackle() {
  const rodRows = RODS.map(r => {
    const owned = save.rods.includes(r.id), equipped = save.rod === r.id;
    const btn = equipped ? '<button class="btn plain" disabled>Equipped</button>'
      : owned ? `<button class="btn mint" data-rod="${r.id}">Equip</button>`
      : `<button class="btn gold" data-rod="${r.id}" ${save.coins < r.price ? 'disabled' : ''}>Buy ${coinHTML(r.price)}</button>`;
    return `<li class="gear ${equipped ? 'equipped' : ''}">
      <b><span class="rod-swatch" style="background:${r.color}"></span>${r.name}</b>
      <span class="desc">${r.blurb}</span>
      <span class="stats"><span>Net size ${r.net}</span><span>Reel speed ${Math.round(r.gain * 100)}</span><span>Luck +${Math.round(r.luck * 100)}</span></span>
      ${btn}</li>`;
  }).join('');
  const bucketRows = BUCKETS.map((b, i) => {
    const btn = i <= save.bucketLvl ? `<button class="btn plain" disabled>${i === save.bucketLvl ? 'In use' : 'Outgrown'}</button>`
      : i === save.bucketLvl + 1 ? `<button class="btn gold" data-bucket="${i}" ${save.coins < b.price ? 'disabled' : ''}>Buy ${coinHTML(b.price)}</button>`
      : '<button class="btn plain" disabled>Upgrade first</button>';
    return `<li class="gear ${i === save.bucketLvl ? 'equipped' : ''}">
      <b>${b.name}</b><span class="desc">Holds ${b.cap} fish</span><span class="stats"></span>${btn}</li>`;
  }).join('');
  $('#shop-tackle').innerHTML = `<h3>Rods</h3><ul class="gear-list">${rodRows}</ul><h3>Buckets</h3><ul class="gear-list">${bucketRows}</ul>`;
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
  }
});

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

// ================================================================= bucket ==
function openBucket() {
  renderBucket();
  openModal('modal-bucket');
  Sound.sfx.open();
}

function renderBucket() {
  const total = save.bucket.reduce((s, c) => s + c.value, 0);
  $('#bucket-h').textContent = BUCKETS[save.bucketLvl].name;
  $('#bucket-sub').innerHTML = `${save.bucket.length} / ${bucketCap()} fish · worth ${coinHTML(total)}`;
  $('#btn-sell-all').disabled = !save.bucket.length;
  $('#btn-sell-all').innerHTML = save.bucket.length ? `Sell all for ${coinHTML(total)}` : 'Sell all';
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
      <button class="btn gold" data-sell="${c.uid}" aria-label="Sell ${sp.name} for ${c.value} coins">${coinHTML(c.value)}</button>
    </li>`;
  }).join('');
}

$('#bucket-list').addEventListener('click', e => {
  const b = e.target.closest('[data-sell]');
  if (!b) return;
  sellFish(Number(b.dataset.sell));
  renderBucket();
  const next = $('#bucket-list [data-sell]');
  (next || $('#modal-bucket .close-btn')).focus({ preventScroll: true });
});

$('#btn-sell-all').addEventListener('click', () => {
  sellAll();
  renderBucket();
  $('#modal-bucket .close-btn').focus({ preventScroll: true });
});

// ================================================================ fishdex ==
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary', 'junk'];

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
  $('#map-count').textContent = `${count} fish caught`;
  $('#map-list').innerHTML = LOCATIONS.map(loc => {
    const here = loc.id === save.location;
    const open = save.unlocked.includes(loc.id);
    const species = FISH.filter(f => fishWhere(f).includes(loc.id) && f.rarity !== 'junk');
    const found = species.filter(f => save.dex[f.id]).length;
    let action;
    if (here) action = '<button class="btn plain" disabled>You are here</button>';
    else if (open) action = `<button class="btn mint" data-sail="${loc.id}" ${canTravel() ? '' : 'disabled'}>${canTravel() ? 'Sail here' : 'Finish reeling first'}</button>`;
    else {
      const pct = Math.round((count / loc.need) * 100);
      action = `<div class="progress" role="progressbar" aria-valuenow="${count}" aria-valuemax="${loc.need}"><span style="width:${pct}%"></span></div>
        <span class="desc">Catch ${loc.need - count} more fish to unlock</span>`;
    }
    return `<li class="${here ? 'here' : ''} ${open ? '' : 'locked'}">
      <b>${open ? loc.name : '???'}</b>
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
  for (const loc of LOCATIONS) {
    const { x, y } = loc.map;
    const open = save.unlocked.includes(loc.id);
    const sand = open ? '#f0d0a0' : '#8a90a8', green = open ? ({ dock: '#6aa860', lagoon: '#ff9ec4', cove: '#4fc0a0', bay: '#f4faff' })[loc.id] : '#6a7090';
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
    }
    if (loc.id === save.location) {
      const bob = Math.round(Math.sin(t * 3));
      R(x - 12, y + 5 + bob, 9, 3, '#e0566e'); R(x - 12, y + 5 + bob, 9, 1, '#fff4e0');
      R(x - 8, y - 2 + bob, 1, 7, '#6a3a2e'); R(x - 7, y - 1 + bob, 3, 4, '#fff4e0');
    }
  }
}

// ============================================================= catch card ==
function showCatchCard(c) {
  const sp = FISH_BY_ID[c.id];
  const r = RARITY[sp.rarity];
  const full = save.bucket.length >= bucketCap();
  $('#catch-img').src = fishDataUrl(sp);
  $('#catch-img').alt = sp.name;
  $('#catch-new').hidden = !c.isNew;
  $('#catch-rarity').textContent = r.label;
  $('#catch-rarity').style.background = r.color;
  $('#catch-name').textContent = sp.name;
  $('#catch-meta').innerHTML = `${c.size} cm · <span class="stars" aria-label="${c.stars} of 3 stars">${starText(c.stars)}</span>`;
  $('#catch-blurb').textContent = sp.blurb;
  const keep = $('#catch-keep');
  keep.disabled = full;
  keep.textContent = full ? 'Bucket full' : 'Keep';
  $('#catch-sell').innerHTML = `Sell ${coinHTML(c.value)}`;
  keep.toggleAttribute('data-autofocus', !full);
  $('#catch-sell').toggleAttribute('data-autofocus', full);
  openModal('modal-catch');
}

function resolveCatch(action) {
  forceClose();
  finishCatch(action);
  $('#action-btn').focus({ preventScroll: true });
}

$('#catch-keep').addEventListener('click', () => resolveCatch('keep'));
$('#catch-sell').addEventListener('click', () => resolveCatch('sell'));
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
  drawMap();
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

const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

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
$('#btn-bucket').addEventListener('click', openBucket);
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
