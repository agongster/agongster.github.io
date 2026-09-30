// Tiny Tides — online: accounts, cloud saves, friends and gifts.
// The game always saves to this browser first (see writeSave in game.js).
// When logged in, it also uploads the save a few seconds after it changes.
// Every upload says which version it was based on, so if another device saved
// in between, the server refuses it and we sort it out instead of overwriting.
// Coins sent or received as gifts are moved by the server itself; the game
// then adopts the server's new balance and version.

// ?api=http://127.0.0.1:8000 points the game at a backend running locally.
// Only localhost is accepted: otherwise a crafted link could send someone's
// password to a stranger's server.
const API_BASE = (() => {
  const override = new URLSearchParams(location.search).get('api');
  if (override && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(override)) return override;
  return 'https://tiny-tides-backend.onrender.com';
})();
const SESSION_KEY = 'tiny-tides-session-v1';

const Online = (() => {
  // { token, user: {id, username, email}, version, dirty }
  let session = readSession();
  let status = session ? 'idle' : 'offline';
  let pushTimer = null, pushPromise = null, pushAgain = false, applying = false;
  // views: login | signup | friends | gifts | profile
  let view = session ? 'friends' : 'login';
  let busy = false, errorText = '', slowTimer = null;
  let friends = { friends: [], incoming: [], outgoing: [] }, friendsLoaded = false;
  let giftTarget = null, giftInfo = null, gifts = null, notice = '';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
  }
  function writeSession() {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* storage blocked: the session just won't survive a reload */ }
  }

  // ------------------------------------------------------------ requests --
  async function api(path, { method = 'GET', body, keepalive = false, timeout = 75000 } = {}) {
    const ctrl = new AbortController();
    const abort = setTimeout(() => ctrl.abort(), timeout);
    // Render's free tier sleeps; the first request can take up to a minute
    const slow = setTimeout(() => setStatus('waking'), 2500);
    try {
      const res = await fetch(API_BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
        keepalive,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && session && path !== '/api/auth/login') expireSession();
      if (status === 'waking') setStatus('idle');
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: { detail: 'network' } };
    } finally {
      clearTimeout(abort);
      clearTimeout(slow);
    }
  }

  function setStatus(s) {
    status = s;
    renderPill();
    if (openId === 'modal-account' && view === 'profile') render();
  }

  // ---------------------------------------------------------- save sync --
  function cloudPayload() {
    const data = JSON.parse(JSON.stringify(save));
    return { data, coins: save.coins, version: session.version };
  }

  // Replaces the game's save with one from the server.
  function applyCloud(cloud) {
    const s = Object.assign(freshSave(), cloud.data || {});
    s.coins = cloud.coins;
    sanitizeSave(s);
    for (const k of Object.keys(save)) delete save[k];
    Object.assign(save, s);
    session.version = cloud.version;
    session.dirty = false;
    writeSession();
    applying = true;
    writeSave();
    applying = false;
    reloadGameFromSave();
  }

  // The server changed our coins itself (a gift sent or received).
  function applyServerCoins(coins, version) {
    save.coins = coins;
    session.version = version;
    session.dirty = false;
    writeSession();
    applying = true;
    writeSave();
    applying = false;
    refreshHUD();
  }

  // Called by writeSave() every time the game saves locally.
  function localSaved() {
    if (!session || applying) return;
    session.dirty = true;
    writeSession();
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 4000);
  }

  function push() {
    if (!session) return Promise.resolve();
    if (pushPromise) { pushAgain = true; return pushPromise; }
    pushPromise = doPush().finally(() => {
      pushPromise = null;
      if (pushAgain) { pushAgain = false; push(); }
    });
    return pushPromise;
  }

  async function doPush() {
    setStatus('saving');
    const r = await api('/api/save', { method: 'PUT', body: cloudPayload() });
    if (!session) return;
    if (r.ok) {
      session.version = r.data.version;
      session.dirty = false;
      writeSession();
      setStatus('saved');
    } else if (r.status === 409) {
      await resolveNewerCloud();
    } else if (r.status === 422 && r.data.detail && r.data.detail.error === 'coins_jump') {
      // the server won't accept that many new coins at once; keep its balance
      save.coins = r.data.detail.coins;
      refreshHUD();
      toast("Your coins didn't add up, so they were reset to your last online balance.");
      pushAgain = true;
    } else if (r.status !== 401) {
      setStatus('offline');
    }
  }

  // Upload anything unsaved right now, and report whether it worked.
  async function pushNow() {
    clearTimeout(pushTimer);
    if (session && session.dirty) await push();
    return !!session && !session.dirty;
  }

  // Leaving the page: fire one last upload that the browser finishes on its own.
  // If the page survives (back/forward cache), record the new version it got,
  // or the next save would look out of date and be refused.
  function flush() {
    if (!session || !session.dirty) return;
    const sent = session;
    try {
      fetch(API_BASE + '/api/save', {
        method: 'PUT', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(cloudPayload()),
      }).then(res => (res.ok ? res.json() : null)).then(d => {
        if (!d || session !== sent) return;
        session.version = d.version;
        session.dirty = false;
        writeSession();
        setStatus('saved');
      }).catch(() => {});
    } catch (e) { /* the next visit will sync instead */ }
  }

  // The server has a newer save than we last saw: another device played, or a
  // gift changed our coins. Logged in, the online save is the one that counts.
  async function resolveNewerCloud() {
    const r = await api('/api/save');
    if (!r.ok || !r.data.exists) { setStatus('offline'); return; }
    applyCloud(r.data);
    setStatus('saved');
  }

  // On load: catch up with anything another device saved while we were away.
  async function syncOnLoad() {
    if (!session) return;
    Net.home();
    const r = await api('/api/save');
    if (!session) return;
    if (!r.ok) { setStatus(r.status === 0 ? 'offline' : status); return; }
    if (!r.data.exists) { if (save.started) push(); return; }
    if (r.data.version > session.version) {
      applyCloud(r.data);
      setStatus('saved');
    } else if (session.dirty) {
      await push();
    } else {
      setStatus('saved');
    }
    claimGifts();
    loadFriends();
  }

  // ------------------------------------------------------------- auth --
  const ERRORS = {
    email_taken: 'That email already has an account. Try logging in instead.',
    username_taken: 'That username is taken. Try another one!',
    wrong_login: 'Wrong email/username or password.',
    network: "Couldn't reach the server. Check your connection and try again.",
    user_not_found: 'No angler has that username.',
    cant_friend_self: "That's you! Try a friend's username.",
    already_friends: "You're already friends!",
    already_requested: 'You already sent them a request.',
    not_enough_coins: "You don't have that many coins.",
    not_friends: 'You can only gift friends.',
  };

  function errorMessage(r) {
    const d = r.data && r.data.detail;
    if (typeof d === 'string') return ERRORS[d] || 'Something went wrong. Please try again.';
    if (d && d.error === 'daily_limit') return d.remaining ? `You can gift ${d.remaining} more coins today.` : "You've hit today's gifting limit. Try again tomorrow!";
    if (Array.isArray(d) && d[0]) {
      const field = d[0].loc && d[0].loc[d[0].loc.length - 1];
      if (field === 'password') return 'Passwords need at least 8 characters.';
      if (field === 'username') return 'Usernames are 3 to 16 letters, numbers or underscores.';
      if (field === 'email') return "That doesn't look like an email address.";
      if (field === 'amount') return 'Gifts are 1 to 1000 coins.';
    }
    return 'Something went wrong. Please try again.';
  }

  async function submitAuth(kind, fields) {
    busy = true; errorText = '';
    render();
    slowTimer = setTimeout(() => { if (busy) render(true); }, 2500);
    const r = await api(kind === 'signup' ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: fields });
    clearTimeout(slowTimer);
    busy = false;
    if (!r.ok) { errorText = errorMessage(r); render(); return; }
    session = { token: r.data.token, user: r.data.user, version: 0, dirty: false };
    writeSession();
    const dev = document.getElementById('dev-panel');
    if (dev) dev.dispatchEvent(new Event('tt-close'));
    await afterLogin();
  }

  async function afterLogin() {
    const r = await api('/api/save');
    // an account that already has a save always uses it, over this device's
    if (r.ok && r.data.exists) {
      applyCloud(r.data);
      toast(`Welcome back, @${session.user.username}!`);
      setStatus('saved');
    } else {
      toast(`Signed in as @${session.user.username}. Your progress now saves online.`);
      if (save.started) await push(); else setStatus('saved');
    }
    finishLogin();
  }

  function finishLogin() {
    Net.home();
    view = 'friends';
    render();
    renderPill();
    window.dispatchEvent(new Event('tt-login'));
    claimGifts();
    loadFriends();
  }

  function logout() {
    flush();
    session = null;
    writeSession();
    Net.reset();
    friends = { friends: [], incoming: [], outgoing: [] };
    friendsLoaded = false;
    setStatus('offline');
    view = 'login';
    render();
    toast('Logged out. Your progress stays on this device.');
  }

  function expireSession() {
    session = null;
    writeSession();
    Net.reset();
    status = 'offline';
    view = 'login';
    renderPill();
    toast('Your login expired. Please log in again to keep saving online.');
  }

  // ------------------------------------------------------------ friends --
  async function loadFriends() {
    if (!session) return;
    const r = await api('/api/friends', { timeout: 30000 });
    if (!r.ok) return;
    friends = r.data;
    friendsLoaded = true;
    renderPill();
    if (openId === 'modal-account' && view === 'friends') render();
  }

  async function friendAction(fn, success) {
    notice = '';
    const r = await fn();
    if (!r.ok) { notice = errorMessage(r); render(); return false; }
    if (success) toast(success(r.data));
    await loadFriends();
    return true;
  }

  // Pushes from the server over the live connection.
  function onNotify(m) {
    if (m.t === 'friend_request') { toast(`@${m.from} wants to be friends!`); Sound.sfx.open(); loadFriends(); }
    if (m.t === 'friend_accepted') { toast(`@${m.from} accepted your friend request!`); Sound.sfx.buy(); loadFriends(); }
    if (m.t === 'gift') claimGifts();
  }

  // -------------------------------------------------------------- gifts --
  async function claimGifts() {
    if (!session) return;
    if (!(await pushNow())) return;
    const r = await api('/api/gifts/claim', { method: 'POST' });
    if (!r.ok || !r.data.claimed.length) return;
    applyServerCoins(r.data.coins, r.data.version);
    Sound.sfx.coin();
    for (const g of r.data.claimed) {
      toast(`@${g.username} sent you ${g.amount} coins${g.note ? `: "${g.note}"` : '!'}`, 'coin');
    }
    gifts = null;
  }

  async function openGiftForm(username) {
    giftTarget = username;
    notice = '';
    giftInfo = null;
    render();
    const r = await api('/api/gifts', { timeout: 30000 });
    if (r.ok) { giftInfo = r.data; if (giftTarget === username) render(); }
  }

  async function sendGift(to, amount, note) {
    notice = '';
    busy = true;
    render();
    if (!(await pushNow())) {
      busy = false;
      notice = "Couldn't save your progress first. Check your connection and try again.";
      render();
      return;
    }
    const r = await api('/api/gifts', { method: 'POST', body: { to, amount, note } });
    busy = false;
    if (!r.ok) { notice = errorMessage(r); render(); return; }
    applyServerCoins(r.data.coins, r.data.version);
    Sound.sfx.coin();
    toast(`Sent ${amount} coins to @${to}!`);
    giftTarget = null;
    gifts = null;
    render();
  }

  async function loadGifts() {
    const r = await api('/api/gifts', { timeout: 30000 });
    if (r.ok) { gifts = r.data; if (view === 'gifts') render(); }
  }

  // ------------------------------------------------------------- UI --
  const summary = s => {
    const caught = (s.stats && s.stats.caught) || 0;
    const dex = Object.keys(s.dex || {}).length;
    return `${caught} catches · ${s.coins || 0} coins · Fishdex ${dex}/${FISH.length}`;
  };

  function renderPill() {
    const pill = $('#cloud-pill');
    if (!pill) return;
    pill.hidden = !session;
    const text = {
      idle: 'Online', saved: 'Saved online', saving: 'Saving...', waking: 'Waking server...',
      offline: 'Offline',
    }[status] || 'Online';
    pill.textContent = session ? text : '';
    pill.dataset.state = status;
    const pending = session ? friends.incoming.length : 0;
    const btn = $('#btn-online');
    const onlineCount = session ? friends.friends.filter(p => p.online).length : 0;
    btn.textContent = session ? `Friends${pending ? ` (${pending} new)` : ''}` : 'Log in / Sign up';
    if (session && onlineCount) btn.insertAdjacentHTML('beforeend', ` <span class="online-count">${onlineCount} on</span>`);
    btn.title = session ? `${onlineCount} friend${onlineCount === 1 ? '' : 's'} online` : '';
    btn.classList.toggle('nudge', !session);
    $('#btn-profile').hidden = !session;
  }

  const where = f => (!f.online ? 'offline' : f.at === 'home' ? 'fishing at home' : `visiting @${f.at}`);

  function render(slow = false) {
    const body = $('#account-body');
    if (!body) return;
    const escape = escapeHTML;
    if (session) {
      if (!['friends', 'gifts', 'profile'].includes(view)) view = 'friends';
      $('#account-h').textContent = `@${session.user.username}`;
      const tabs = `<div class="tabs small" role="tablist">
        <button role="tab" data-view="friends" aria-selected="${view === 'friends'}">Friends${friends.incoming.length ? ` (${friends.incoming.length})` : ''}</button>
        <button role="tab" data-view="gifts" aria-selected="${view === 'gifts'}">Gifts</button>
        <button role="tab" data-view="profile" aria-selected="${view === 'profile'}">Profile</button>
      </div>`;
      body.innerHTML = tabs + (view === 'friends' ? friendsHTML() : view === 'gifts' ? giftsHTML() : profileHTML());
      if (view === 'profile') drawAvatar();
      return;
    }
    $('#account-h').textContent = 'Play online';
    const signup = view === 'signup';
    // re-rendering (to show an error or "one sec...") must not wipe what was typed
    const oldForm = $('#auth-form');
    const typed = oldForm ? Object.fromEntries(new FormData(oldForm).entries()) : {};
    const val = name => `value="${escape(typed[name] || '')}"`;
    body.innerHTML = `
      <div class="tabs small" role="tablist">
        <button role="tab" data-view="login" aria-selected="${!signup}">Log in</button>
        <button role="tab" data-view="signup" aria-selected="${signup}">Sign up</button>
      </div>
      <form id="auth-form" class="auth-form" novalidate>
        ${signup ? `<label>Email<input name="email" type="email" autocomplete="email" required ${val('email')} /></label>
          <label>Username <span id="name-hint" class="fine"></span>
            <input name="username" autocomplete="username" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" required ${val('username')} /></label>`
          : `<label>Email or username<input name="login" autocomplete="username" required ${val('login')} /></label>`}
        <label>Password${signup ? ' <span class="fine">(8+ characters)</span>' : ''}
          <input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="${signup ? 8 : 1}" required ${val('password')} /></label>
        <p class="auth-error" role="alert">${escape(errorText)}</p>
        <button class="btn big" type="submit" ${busy ? 'disabled' : ''}>${busy ? (slow ? 'Waking up the server...' : 'One sec...') : signup ? 'Create account' : 'Log in'}</button>
        ${busy && slow ? '<p class="fine">Free hosting naps when nobody is around. This can take up to a minute the first time.</p>' : ''}
      </form>
      <p class="fine">${signup ? 'Your username is how friends will find you.' : 'Your progress saves to your account, so you can keep fishing on any device.'}</p>`;
  }

  function friendsHTML() {
    const escape = escapeHTML;
    const f = friends;
    const giftForm = name => {
      const left = giftInfo ? giftInfo.remaining_today : null;
      return `<form class="gift-form" data-giftform="${escape(name)}">
        <div class="gift-quick">${[10, 50, 100, 250].map(n => `<button type="button" class="btn plain" data-amount="${n}">${n}</button>`).join('')}</div>
        <label>Coins<input name="amount" type="number" min="1" max="1000" value="50" required /></label>
        <label>Note <span class="fine">(optional)</span><input name="note" maxlength="60" placeholder="Enjoy!" /></label>
        <p class="fine">You have ${save.coins} coins${left === null ? '' : ` · ${left} left to gift today`}</p>
        <div class="row-actions"><button class="btn gold" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Sending...' : `Send to @${escape(name)}`}</button>
          <button class="btn plain" type="button" data-fr="cancelgift">Cancel</button></div>
      </form>`;
    };
    const sorted = [...f.friends].sort((a, b) => b.online - a.online);
    const rows = sorted.map(p => `
      <li class="friend ${p.online ? 'online' : ''}">
        <span class="dot" aria-hidden="true"></span>
        <span class="friend-name"><b>@${escape(p.username)} <span class="status-chip ${p.online ? 'on' : ''}">${p.online ? 'Online' : 'Offline'}</span></b>
          <span class="fine">${p.online ? where(p) : 'visit anyway: their world is always open'}</span></span>
        <span class="row-actions">
          <button class="btn mint" data-fr="visit" data-name="${escape(p.username)}">Visit</button>
          <button class="btn gold" data-fr="gift" data-name="${escape(p.username)}">Gift</button>
          <button class="btn plain small-x" data-fr="remove" data-name="${escape(p.username)}" aria-label="Remove @${escape(p.username)}">X</button>
        </span>
        ${giftTarget === p.username ? giftForm(p.username) : ''}
      </li>`).join('');
    return `
      <form id="add-friend" class="add-friend">
        <input name="username" placeholder="Friend's username" maxlength="16" autocomplete="off" aria-label="Friend's username" />
        <button class="btn" type="submit">Add friend</button>
      </form>
      <p class="auth-error" role="alert">${escape(notice)}</p>
      ${f.incoming.length ? `<h3>Friend requests</h3><ul class="friend-list">${f.incoming.map(p => `
        <li class="friend"><span class="friend-name"><b>@${escape(p.username)}</b><span class="fine">wants to be friends</span></span>
          <span class="row-actions"><button class="btn mint" data-fr="accept" data-id="${p.request_id}">Accept</button>
          <button class="btn plain" data-fr="decline" data-id="${p.request_id}">Decline</button></span></li>`).join('')}</ul>` : ''}
      <h3>Friends</h3>
      ${!friendsLoaded ? '<p class="fine">Loading...</p>' : f.friends.length ? `<ul class="friend-list">${rows}</ul>`
        : '<p class="empty" style="display:block">No friends yet. Add someone by their username!</p>'}
      ${f.outgoing.length ? `<h3>Sent requests</h3><ul class="friend-list">${f.outgoing.map(p => `
        <li class="friend"><span class="friend-name"><b>@${escape(p.username)}</b><span class="fine">waiting for them to accept</span></span>
          <span class="row-actions"><button class="btn plain" data-fr="cancel" data-name="${escape(p.username)}">Cancel</button></span></li>`).join('')}</ul>` : ''}
      <p class="fine">Your username is <b>@${escape(session.user.username)}</b>. Share it so friends can add you.</p>`;
  }

  function giftsHTML() {
    const escape = escapeHTML;
    if (!gifts) { loadGifts(); return '<p class="fine">Loading...</p>'; }
    const list = (items, dir) => items.length ? `<ul class="gift-list">${items.map(g => `
      <li><span><b>${g.amount}</b> coins ${dir} <b>@${escape(g.username)}</b>${g.note ? ` · "${escape(g.note)}"` : ''}</span>
        <span class="fine">${new Date(g.sent_at).toLocaleDateString()}</span></li>`).join('')}</ul>` : '<p class="fine">Nothing yet.</p>';
    return `<p>You can gift <b>${gifts.remaining_today}</b> more coins today. Send gifts from the Friends tab.</p>
      <h3>Received</h3>${list(gifts.received, 'from')}
      <h3>Sent</h3>${list(gifts.sent, 'to')}`;
  }

  function profileHTML() {
    const escape = escapeHTML;
    const statusText = {
      saved: 'Your progress is saved online.', saving: 'Saving...', waking: 'Waking up the server...',
      offline: "Can't reach the server right now. Progress is safe on this device and will upload later.",
      idle: 'Connected.',
    }[status] || '';
    return `
      <div class="profile-card">
        <canvas id="profile-avatar" width="32" height="30" aria-label="Your angler"></canvas>
        <div>
          <p class="account-name"><b>${escape(save.name || 'Angler')}</b> · @${escape(session.user.username)}</p>
          <p class="fine">${summary(save)}</p>
          <p class="fine">${escape(session.user.email)}</p>
        </div>
      </div>
      <div class="account-actions">
        <button class="btn gold" data-act="shop">Change your look</button>
        <button class="btn" data-act="boat">Customize your boat</button>
      </div>
      <p>${statusText}</p>
      <div class="account-actions">
        <button class="btn mint" data-act="sync">Save now</button>
        <button class="btn plain" data-act="logout">Log out</button>
      </div>`;
  }

  // a still of your angler for the profile tab
  function drawAvatar() {
    const c = $('#profile-avatar');
    if (!c) return;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#ffc9a0'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(anglerSprite(save.look, {}), c.width / 2 - ANGLER_W / 2, c.height - 2 - ANGLER_FEET);
  }

  function openAccount(want) {
    if (want === 'login' || want === 'signup') { if (!session) { view = want; errorText = ''; } }
    else if (want === 'profile' && session) view = 'profile';
    if (openId !== 'modal-account') openModal('modal-account');
    render();
  }

  let nameCheck = null;
  function onInput(e) {
    if (e.target.name !== 'username' || view !== 'signup') return;
    clearTimeout(nameCheck);
    const hint = $('#name-hint'), name = e.target.value;
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { hint.textContent = name ? '3-16 letters, numbers or _' : ''; return; }
    hint.textContent = 'checking...';
    nameCheck = setTimeout(async () => {
      const r = await api(`/api/usernames/${encodeURIComponent(name)}`, { timeout: 20000 });
      if ($('#name-hint') && e.target.value === name) hint.textContent = !r.ok ? '' : r.data.available ? 'available!' : 'taken';
    }, 400);
  }

  function wire() {
    const body = $('#account-body');
    body.addEventListener('input', onInput);
    body.addEventListener('submit', e => {
      e.preventDefault();
      if (busy) return;
      const f = Object.fromEntries(new FormData(e.target).entries());
      if (e.target.id === 'add-friend') {
        const name = (f.username || '').trim();
        if (!name) return;
        friendAction(() => api('/api/friends/requests', { method: 'POST', body: { username: name } }),
          d => (d.status === 'accepted' ? `You and @${d.username} are now friends!` : `Friend request sent to @${d.username}`));
        return;
      }
      if (e.target.dataset.giftform) {
        const amount = Math.floor(Number(f.amount));
        if (!(amount >= 1 && amount <= 1000)) { notice = 'Gifts are 1 to 1000 coins.'; render(); return; }
        sendGift(e.target.dataset.giftform, amount, (f.note || '').trim());
        return;
      }
      if (view === 'signup') submitAuth('signup', { email: f.email.trim(), username: f.username.trim(), password: f.password });
      else submitAuth('login', { login: f.login.trim(), password: f.password });
    });
    body.addEventListener('click', e => {
      const tab = e.target.closest('[data-view]');
      if (tab) { view = tab.dataset.view; errorText = ''; notice = ''; if (view === 'gifts') gifts = null; if (view === 'friends') loadFriends(); render(); return; }
      const amt = e.target.closest('[data-amount]');
      if (amt) { const input = amt.closest('form').querySelector('[name=amount]'); input.value = amt.dataset.amount; return; }
      const fr = e.target.closest('[data-fr]');
      if (fr) {
        const name = fr.dataset.name;
        switch (fr.dataset.fr) {
          case 'visit': forceClose(); Net.visit(name); break;
          case 'gift': openGiftForm(name); break;
          case 'cancelgift': giftTarget = null; render(); break;
          case 'accept': friendAction(() => api(`/api/friends/requests/${fr.dataset.id}/accept`, { method: 'POST' }), () => 'New friend!'); break;
          case 'decline': friendAction(() => api(`/api/friends/requests/${fr.dataset.id}/decline`, { method: 'POST' })); break;
          case 'cancel': friendAction(() => api(`/api/friends/${encodeURIComponent(name)}`, { method: 'DELETE' })); break;
          case 'remove':
            if (confirm(`Remove @${name} from your friends?`)) friendAction(() => api(`/api/friends/${encodeURIComponent(name)}`, { method: 'DELETE' }));
            break;
        }
        return;
      }
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'logout') logout();
      if (act && (act.dataset.act === 'shop' || act.dataset.act === 'boat')) {
        forceClose();
        openShop(false, act.dataset.act === 'boat' ? 'boat' : 'wardrobe');
      }
      if (act && act.dataset.act === 'sync') { clearTimeout(pushTimer); session.dirty = true; push(); }
    });
    $('#btn-online').addEventListener('click', () => {
      if (session && !['friends', 'gifts', 'profile'].includes(view)) view = 'friends';
      if (session) loadFriends();
      openAccount();
      Sound.sfx.open();
    });
    $('#cloud-pill').addEventListener('click', () => { view = session ? 'profile' : 'login'; openAccount(); });
    $('#btn-profile').addEventListener('click', () => { openAccount('profile'); Sound.sfx.open(); });
    window.addEventListener('pagehide', flush);
    // switching tabs: the page stays alive, so a normal save reads its reply
    document.addEventListener('visibilitychange', () => { if (document.hidden && session && session.dirty) pushNow(); });
    // keep presence fresh for the friends list and the "N on" count on the HUD
    setInterval(() => { if (session && !document.hidden && !giftTarget) loadFriends(); }, 30000);
    renderPill();
    // Net is defined in net.js, which loads right after this file
    setTimeout(syncOnLoad, 0);
  }

  wire();

  return {
    loggedIn: () => !!session,
    username: () => (session ? session.user.username : null),
    token: () => (session ? session.token : ''),
    api,
    localSaved,
    refreshFriends: () => { if (session) loadFriends(); },
    onNotify,
    open: openAccount,
    openGift: name => { view = 'friends'; openAccount(); loadFriends(); openGiftForm(name); },
  };
})();
