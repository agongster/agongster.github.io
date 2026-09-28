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
  $('#phase-pill').textContent = phase ? phase.name : '';
  if (openId === 'modal-shop') renderShop();
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
      <span class="stats"><span>Catch zone ${Math.round(r.zone * 100)}%</span><span>Reel speed ${Math.round(r.gain * 100)}</span><span>Luck +${Math.round(r.luck * 100)}</span></span>
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

function renderDex() {
  const found = FISH.filter(f => save.dex[f.id]).length;
  const catches = `${save.stats.caught} catch${save.stats.caught === 1 ? '' : 'es'}`;
  $('#dex-progress').textContent = `${found}/${FISH.length}`;
  $('#dex-stats').textContent = found === FISH.length
    ? `You found every single one. The pond is proud of you. (${catches}, ${save.stats.earned} coins earned)`
    : `${catches} so far · ${save.stats.earned} coins earned. Silhouettes show what's still out there, and when it swims.`;
  const phaseName = id => PHASES.find(p => p.id === id).name;
  const sorted = FISH.slice().sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  $('#dex-grid').innerHTML = sorted.map(sp => {
    const d = save.dex[sp.id];
    const r = RARITY[sp.rarity];
    const chips = sp.phases.length === 4 ? '<span class="chip">Any time</span>'
      : sp.phases.map(p => `<span class="chip">${phaseName(p)}</span>`).join('');
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
  idle: 'Hold to cast', charging: 'Let go!', casting: 'Whoosh...', waiting: 'Wait for the dip...',
  bite: 'TAP NOW!', reeling: 'Hold to reel', retract: 'Reeling in...', landing: 'Got it!', showing: 'Nice!',
};
let lastActionState = null;

function uiTick() {
  if (G.state !== lastActionState) {
    lastActionState = G.state;
    const btn = $('#action-btn');
    btn.textContent = ACTION_LABELS[G.state] || 'Hold to cast';
    btn.classList.toggle('gold', G.state === 'bite');
    btn.classList.toggle('mint', G.state === 'reeling');
  }
  drawPreview();
}

function bindHold(el) {
  el.addEventListener('pointerdown', e => {
    if (openId || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    Sound.init();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    el.classList.add('pressed');
    press();
  });
  const up = () => { el.classList.remove('pressed'); release(); };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindHold($('#stage'));
bindHold($('#action-btn'));

const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); return; }
  if (openId || isTyping(e.target)) return;
  const hudButton = e.target.closest && e.target.closest('button') && e.target.id !== 'action-btn';
  if (e.code === 'Space' || (e.key === 'Enter' && !hudButton)) {
    e.preventDefault();
    if (e.repeat) return;
    Sound.init();
    press();
  }
});
document.addEventListener('keyup', e => {
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
