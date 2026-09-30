// Tiny Tides — dev mode.
// Open with ?dev in the URL, or press the backtick key (`) to toggle.
// Pick exactly which fish bites next, skip the waiting, and jump around the
// game for testing and recording demos.

(() => {
  const panel = document.createElement('aside');
  panel.id = 'dev-panel';
  panel.className = 'dev-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Developer tools');

  const optgroups = LOCATIONS.map(loc => {
    const fish = FISH.filter(f => fishWhere(f).includes(loc.id) && fishWhere(f).length < LOCATIONS.length);
    return `<optgroup label="${loc.name}">${fish.map(f =>
      `<option value="${f.id}">${f.name} (${RARITY[f.rarity].label})</option>`).join('')}</optgroup>`;
  }).join('');
  const everywhere = FISH.filter(f => fishWhere(f).length === LOCATIONS.length);

  panel.innerHTML = `
    <header><b>DEV MODE</b><button class="dev-x" data-dev="close" aria-label="Close dev mode">X</button></header>
    <label>Catch this fish
      <select id="dev-fish">
        <option value="">Random (normal game)</option>
        <optgroup label="Anywhere">${everywhere.map(f => `<option value="${f.id}">${f.name} (${RARITY[f.rarity].label})</option>`).join('')}</optgroup>
        ${optgroups}
      </select>
    </label>
    <label class="dev-check"><input type="checkbox" id="dev-instant" /> Instant bites</label>
    <div class="dev-row">
      <button data-dev="land">Hook it now</button>
      <button data-dev="win">Win reel</button>
    </div>
    <div class="dev-row">
      <button data-dev="coins">+1000 coins</button>
      <button data-dev="unlock">Unlock map</button>
    </div>
    <label>Time of day
      <select id="dev-time">
        <option value="">(jump to...)</option>
        ${PHASES.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}
      </select>
    </label>
    <p class="dev-note">Dev catches count toward your Fishdex and unlocks.</p>`;
  document.body.appendChild(panel);

  const fishSel = panel.querySelector('#dev-fish');
  const instant = panel.querySelector('#dev-instant');
  const timeSel = panel.querySelector('#dev-time');

  function setOpen(open) {
    if (open && Online.loggedIn()) {
      toast('Dev mode is off while you are logged in, so online coins stay fair.');
      return;
    }
    panel.hidden = !open;
    document.body.classList.toggle('dev-on', open);
    if (!open) { G.dev.fish = ''; G.dev.instant = false; fishSel.value = ''; instant.checked = false; }
  }

  fishSel.addEventListener('change', () => {
    G.dev.fish = fishSel.value;
    if (fishSel.value) toast(`Dev: next bite is ${FISH_BY_ID[fishSel.value].name}`);
    fishSel.blur();
  });
  instant.addEventListener('change', () => { G.dev.instant = instant.checked; instant.blur(); });
  timeSel.addEventListener('change', () => {
    if (timeSel.value === '') return;
    save.clock = Number(timeSel.value) * PHASE_SECONDS + 1;
    gradientAge = 99;
    timeSel.value = '';
    timeSel.blur();
  });

  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-dev]');
    if (!b) return;
    switch (b.dataset.dev) {
      case 'close': setOpen(false); break;
      case 'land':
        // from waiting (or even idle) straight to a bite on the chosen fish
        if (G.state === 'idle') { G.bob.tx = G.aim.x; G.bob.ty = G.aim.y; G.bob.x = G.aim.x; G.bob.y = G.aim.y; }
        if (['idle', 'waiting'].includes(G.state)) {
          SHADOWS.forEach(s => { if (['interested', 'nibble'].includes(s.mode)) s.mode = 'swim'; });
          startBite(null);
        }
        break;
      case 'win':
        if (G.state === 'bite') startReel();
        if (G.state === 'reeling') catchFish();
        break;
      case 'coins':
        save.coins += 1000;
        persist();
        refreshHUD();
        break;
      case 'unlock':
        save.devUnlocked = true;
        for (const loc of LOCATIONS) if (!save.unlocked.includes(loc.id)) save.unlocked.push(loc.id);
        save.newSpot = true;
        persist();
        refreshHUD();
        toast('Dev: every island unlocked');
        break;
    }
    b.blur();
  });

  panel.addEventListener('tt-close', () => setOpen(false));

  document.addEventListener('keydown', e => {
    if (e.key !== '`' || (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) return;
    setOpen(panel.hidden);
  });

  if (new URLSearchParams(location.search).has('dev')) setOpen(true);
})();
