// Tiny Tides — fishing together.
// Every logged-in player keeps one WebSocket open to a "room": their own world
// (so friends can drop in) or a friend's world while visiting. The server just
// relays messages; each player's game still runs its own fishing. We send our
// state a few times a second, and draw everyone else from what they send.

const Net = (() => {
  let ws = null, room = null, you = null;
  let retry = 0, reconnectTimer = null;
  let pingAt = 0, replaced = false, pongs = false;
  let stateTimer = 0, helloTimer = 0, worldTimer = 0, lastState = '';
  const others = new Map(); // username -> player drawn in our scene

  const SLOTS = { dock: [62, 118, 36], boat: [68, 112, 54] };
  const isHome = () => !G.visit;

  // ---------------------------------------------------------- connection --
  function wsUrl(host) {
    return `${API_BASE.replace(/^http/, 'ws')}/ws/world/${encodeURIComponent(host)}`;
  }

  function connect(host) {
    disconnect();
    replaced = false;  // visiting or going home here means "play in this tab"
    if (!Online.loggedIn() || !host) return;
    room = host;
    open();
  }

  function open() {
    try { ws = new WebSocket(wsUrl(room)); } catch (e) { scheduleReconnect(); return; }
    const sock = ws;
    pingAt = 0;
    sock.onopen = () => {
      // the token goes in the first message, never the URL (URLs end up in logs)
      sock.send(JSON.stringify({ t: 'auth', token: Online.token() }));
      retry = 0;
      sendHello();
      if (isHome()) sendWorld();
    };
    sock.onmessage = e => {
      if (ws !== sock) return;  // a connection we've already moved on from
      pingAt = 0;               // any message proves the line is alive
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      handle(m);
    };
    sock.onclose = e => {
      if (ws !== sock) return;
      ws = null;
      others.clear();
      renderBar();
      if (e.code === 4000) stopReplaced(); else scheduleReconnect();
    };
  }

  // The game was opened in another tab or device, which took over this
  // player's connection. Stop here instead of taking it back (the two tabs
  // would keep kicking each other off).
  function stopReplaced() {
    if (replaced) return;
    replaced = true;
    clearTimeout(reconnectTimer);
    if (ws) { const s = ws; ws = null; s.onclose = null; try { s.close(); } catch (e) { /* already closed */ } }
    others.clear();
    renderBar();
    toast('Tiny Tides is open in another tab, so this one stopped playing online. Reload to play here.');
  }

  // A connection can die without closing (a laptop sleeping, a proxy dropping
  // it). Ping every so often; if the last ping got no reply at all, start over.
  // Any message counts as a reply, and this still works when a background tab
  // only runs timers once a minute.
  function heartbeat() {
    if (!ws || ws.readyState !== 1 || replaced) return;
    // (only once the server has shown it answers pings; older servers don't)
    if (pingAt && pongs && Date.now() - pingAt > 12000) {
      const s = ws; ws = null; s.onclose = null;
      try { s.close(); } catch (e) { /* already gone */ }
      others.clear();
      renderBar();
      open();
      return;
    }
    if (!pingAt) { pingAt = Date.now(); send({ t: 'ping' }); }
  }
  setInterval(heartbeat, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });

  function scheduleReconnect() {
    if (!room || !Online.loggedIn() || replaced) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(open, Math.min(30000, 2000 * 2 ** retry++));
  }

  function disconnect() {
    room = null;
    clearTimeout(reconnectTimer);
    if (ws) { const s = ws; ws = null; s.onclose = null; try { s.close(); } catch (e) { /* already closed */ } }
    others.clear();
    renderBar();
  }

  function send(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  // ------------------------------------------------------------ messages --
  function handle(m) {
    switch (m.t) {
      case 'roster':
        you = m.you;
        others.clear();
        for (const mm of m.members) addOther(mm.username, mm.hello);
        if (!isHome() && m.world) applyWorld(m.world);
        renderBar();
        break;
      case 'join':
        addOther(m.from);
        toast(m.from === room ? `@${m.from} is here!` : isHome() ? `@${m.from} came to visit!` : `@${m.from} joined you`);
        Sound.sfx.open();
        sendHello();
        if (isHome()) sendWorld();
        renderBar();
        break;
      case 'leave':
        if (others.has(m.from)) toast(`@${m.from} headed home`);
        others.delete(m.from);
        renderBar();
        break;
      case 'hello':
        addOther(m.from, m);
        break;
      case 'state': {
        const o = addOther(m.from);
        o.s = m.s;
        o.a = Number(m.a) || 0.55;
        if (Number.isFinite(m.x) && Number.isFinite(m.y)) o.tbob = { x: clamp(m.x, 0, W), y: clamp(m.y, 0, H) };
        o.seen = G.time;
        break;
      }
      case 'catch': {
        const o = addOther(m.from);
        const sp = FISH_BY_ID[m.fish];
        if (!sp) break;
        o.catchAnim = { sp, t: 0, sx: o.bob.x, sy: o.bob.y };
        toast(`@${m.from} caught a ${sp.name}!`);
        break;
      }
      case 'emote': {
        const o = addOther(m.from);
        o.emote = { e: m.e === 'heart' ? 'heart' : 'wave', until: G.time + 2.5 };
        break;
      }
      case 'world':
        if (!isHome() && m.from === room) applyWorld(m);
        break;
      case 'pong':
        pongs = true;
        break;
      case 'replaced':
        stopReplaced();
        break;
      case 'error':
        if (m.error === 'room_full') { toast("That world is full right now (4 anglers max)."); goHome(true); }
        else if (m.error === 'not_friends') { toast("You're not friends with them anymore."); goHome(true); }
        break;
      case 'gift': case 'friend_request': case 'friend_accepted':
        Online.onNotify(m);
        break;
    }
  }

  function addOther(name, hello) {
    if (!name || name === you) return { bob: { x: 0, y: 0 } };
    let o = others.get(name);
    if (!o) {
      const used = new Set([...others.values()].map(p => p.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      o = { name, slot, s: 'idle', a: 0.55, bob: { x: 200, y: 140 }, tbob: null, seen: G.time, t: Math.random() * 5 };
      others.set(name, o);
      renderBar();  // e.g. the host was shown napping and is back
    }
    if (hello) {
      o.look = { ...DEFAULT_LOOK, ...(hello.look || {}) };
      o.angler = hello.name || name;
    }
    return o;
  }

  function sendHello() { send({ t: 'hello', look: save.look, name: save.name }); }
  function sendWorld() { send({ t: 'world', location: save.location, clock: Math.round(save.clock), boat: save.boat }); }

  // The host's world changed (they sailed somewhere, or time drifted).
  function applyWorld(w) {
    if (!G.visit) return;
    if (w.boat) G.visit.boat = { ...DEFAULT_BOAT, ...w.boat };
    if (Number.isFinite(w.clock) && Math.abs(w.clock - G.visit.clock) > 4) G.visit.clock = w.clock;
    if (w.location && w.location !== G.visit.location && LOCATIONS.some(l => l.id === w.location)) {
      G.visit.pendingLocation = w.location;
    }
  }

  // Called from the game loop every frame.
  function tick(dt) {
    // follow the host when they sail somewhere, once we're free to go
    if (G.visit && G.visit.pendingLocation && canTravel()) {
      const to = LOCATIONS.find(l => l.id === G.visit.pendingLocation);
      G.visit.pendingLocation = null;
      startTravel({
        label: `Following @${G.visit.host} to ${to.name}...`,
        arrive: `Welcome to ${to.name}!`,
        onSwitch: () => { G.visit.location = to.id; },
      });
    }
    for (const o of others.values()) {
      o.t += dt;
      if (o.tbob) { o.bob.x = lerp(o.bob.x, o.tbob.x, Math.min(1, dt * 8)); o.bob.y = lerp(o.bob.y, o.tbob.y, Math.min(1, dt * 8)); }
      if (o.catchAnim && (o.catchAnim.t += dt) > 1.2) o.catchAnim = null;
    }
    if (!ws || ws.readyState !== 1) return;
    stateTimer -= dt; helloTimer -= dt; worldTimer -= dt;
    const state = JSON.stringify([G.state, Math.round(G.bob.x), Math.round(G.bob.y)]);
    if (stateTimer <= 0 && (state !== lastState || stateTimer < -1.3)) {
      send({ t: 'state', s: G.state, x: Math.round(G.bob.x), y: Math.round(G.bob.y), a: +G.rodA.toFixed(2) });
      lastState = state;
      stateTimer = 0.15;
    }
    if (helloTimer <= 0) { sendHello(); helloTimer = 8; }
    if (isHome() && worldTimer <= 0) { sendWorld(); worldTimer = 3; }
  }

  // ------------------------------------------------------------ visiting --
  async function visit(username) {
    if (!Online.loggedIn()) return;
    if (G.visit && G.visit.host.toLowerCase() === username.toLowerCase()) { toast(`You're already at @${G.visit.host}'s!`); return; }
    if (!canTravel()) { toast('Finish reeling first!'); return; }
    const r = await Online.api(`/api/worlds/${encodeURIComponent(username)}`);
    if (!r.ok) {
      const d = r.data && r.data.detail;
      toast(d === 'no_world' ? `@${username} hasn't started fishing yet.`
        : d === 'not_friends' ? 'You can only visit friends.'
        : "Couldn't reach their world. Try again in a moment.");
      return;
    }
    const w = r.data;
    const going = startTravel({
      label: `Sailing to @${w.username}'s world...`,
      arrive: w.online ? `Welcome to @${w.username}'s world!` : `@${w.username} is napping, but you can fish here anyway!`,
      onSwitch: () => {
        G.visit = {
          host: w.username,
          name: w.name || w.username,
          look: { ...DEFAULT_LOOK, ...(w.look || {}) },
          boat: { ...DEFAULT_BOAT, ...(w.boat || {}) },
          location: LOCATIONS.some(l => l.id === w.location) ? w.location : 'dock',
          clock: Number(w.clock) || 0,
          aquarium: Array.isArray(w.aquarium) ? w.aquarium : [],
          caught: w.caught || 0,
        };
        connect(w.username);
        refreshHUD();
      },
    });
    if (!going) toast('Finish reeling first!');
  }

  function goHome(quiet = false) {
    if (!G.visit) return;
    const back = () => { G.visit = null; connect(Online.username()); refreshHUD(); };
    if (quiet || !startTravel({ label: 'Sailing home...', arrive: 'Home sweet home!', onSwitch: back })) back();
  }

  // Logging out (or the login expiring) drops you straight home.
  function reset() {
    disconnect();
    if (G.visit) { G.visit = null; initShadows(); refreshHUD(); }
  }

  function emote(e) {
    send({ t: 'emote', e });
    G.myEmote = { e, until: G.time + 2.5 };
  }

  // -------------------------------------------------------------- drawing --
  // Everyone in our scene who isn't us: live players, plus a napping host if
  // we're visiting someone who isn't online.
  function players() {
    const list = [...others.values()].filter(o => o.look);
    if (G.visit && !others.has(G.visit.host)) {
      list.push({ name: G.visit.host, look: G.visit.look, slot: 0, asleep: true, s: 'idle', a: 0.4, bob: { x: 0, y: 0 }, t: G.time });
      for (const o of list) if (!o.asleep && o.slot === 0) o.slotShift = true;
    }
    return list;
  }

  function slotX(o, loc) {
    const slots = SLOTS[loc.platform] || SLOTS.dock;
    return slots[(o.slot + (o.slotShift ? 1 : 0)) % slots.length];
  }

  function handOf(o, loc) {
    return { x: slotX(o, loc) + 4, y: FEET_Y - 6 + G.platY };
  }

  function tipOf(o, loc) {
    const h = handOf(o, loc);
    return { x: h.x + Math.sin(o.a) * ROD_LEN, y: h.y - Math.cos(o.a) * ROD_LEN };
  }

  const FISHING = new Set(['casting', 'waiting', 'bite', 'reeling', 'retract']);

  // On the dock/boat, drawn with (and tinted like) our own angler.
  function drawPlayers(g, loc) {
    for (const o of players()) {
      const x = slotX(o, loc), feet = FEET_Y + G.platY;
      const frame = { bob: !o.asleep && Math.floor(o.t * 2) % 2 === 1, blink: o.asleep || (o.t % 4) < 0.12 };
      const spr = anglerSprite(o.look, frame);
      ellipse(g, x, feet + 1, 7, 1, 'rgba(42,26,46,0.28)');
      g.drawImage(spr, x - ANGLER_W / 2, feet - ANGLER_FEET);
      if (o.asleep) continue;
      const h = handOf(o, loc), tip = tipOf(o, loc);
      curve(g, h.x, h.y + 3, (h.x + tip.x) / 2, (h.y + tip.y) / 2, tip.x, tip.y, '#7a4a2a', 0.25);
      rect(g, h.x, h.y + 2, 2, 3, OUTLINE);
    }
  }

  // Lines, bobbers, catches, emotes and napping z's, drawn over the scene.
  function drawLines(g) {
    const loc = currentLoc();
    for (const o of players()) {
      const x = slotX(o, loc), headY = FEET_Y - 30 + G.platY;
      if (o.asleep) {
        const k = (G.time * 0.6) % 1;
        drawZ(g, x + 6 + k * 6, headY - k * 10, 1 - k);
        drawZ(g, x + 3 + ((k + 0.5) % 1) * 6, headY - ((k + 0.5) % 1) * 10, 1 - ((k + 0.5) % 1));
        continue;
      }
      if (FISHING.has(o.s)) {
        const tip = tipOf(o, loc), b = o.bob;
        const taut = o.s === 'reeling' || o.s === 'bite';
        curve(g, tip.x, tip.y, (tip.x + b.x) / 2, Math.max(tip.y, b.y) + (taut ? 0 : 10), b.x, b.y - 3, 'rgba(255,244,224,0.6)');
        if (o.s !== 'casting' && o.s !== 'retract') {
          const bx = Math.round(b.x), by = Math.round(b.y), sunk = o.s === 'bite' ? 2 : 0;
          rect(g, bx - 2, by - 4 + sunk, 5, 4 - sunk, OUTLINE);
          rect(g, bx - 1, by - 3 + sunk, 3, Math.max(1, 2 - sunk), '#7fb8e6');
          if (o.s === 'reeling' && Math.random() < 0.2) splash(b.x, b.y, 1);
        }
      }
      if (o.catchAnim) {
        const c = o.catchAnim, k = Math.min(1, c.t / 0.85);
        const spr = fishSprite(c.sp);
        const px = lerp(c.sx, x, k), py = lerp(c.sy, headY - 6, k) - Math.sin(Math.PI * k) * 36;
        g.drawImage(spr, Math.round(px - spr.width / 2), Math.round(py - spr.height / 2));
        if (Math.random() < 0.4) sparkle(px, py);
      }
      if (o.emote && o.emote.until > G.time && o.emote.e === 'heart') drawHeart(g, x, headY - 4 - Math.sin(G.time * 5) * 2);
    }
    if (G.myEmote && G.myEmote.until > G.time && G.myEmote.e === 'heart') drawHeart(g, CHAR_X, FEET_Y - 34 + G.platY - Math.sin(G.time * 5) * 2);
    updateTags();
  }

  let heartSprite = null;
  function drawHeart(g, x, y) {
    heartSprite = heartSprite || addOutline(mapCanvas(['xx.xx', 'xxxxx', 'xxxxx', '.xxx.', '..x..'], { x: '#ff5c8a' }));
    g.drawImage(heartSprite, Math.round(x - heartSprite.width / 2), Math.round(y));
  }

  function drawZ(g, x, y, alpha) {
    g.fillStyle = `rgba(255,244,224,${Math.max(0, alpha).toFixed(2)})`;
    x = Math.round(x); y = Math.round(y);
    g.fillRect(x, y, 3, 1); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x, y + 2, 3, 1);
  }

  // Name tags are HTML (crisp text), positioned over the canvas each frame.
  function updateTags() {
    const box = $('#player-tags');
    if (!box) return;
    // the chase panel covers the dock, so tags would float over the water
    box.hidden = G.state === 'reeling';
    const loc = currentLoc();
    const list = players();
    const wanted = new Map();
    for (const o of list) {
      const waving = o.emote && o.emote.until > G.time && o.emote.e === 'wave';
      wanted.set(o.name, { x: slotX(o, loc), text: o.asleep ? `@${o.name} (napping)` : waving ? `@${o.name}: hi!` : `@${o.name}`, host: G.visit && o.name === G.visit.host, asleep: o.asleep });
    }
    if (list.length && G.myEmote && G.myEmote.until > G.time && G.myEmote.e === 'wave') wanted.set('\u0000me', { x: CHAR_X, text: 'hi!', me: true });
    for (const el of [...box.children]) if (!wanted.has(el.dataset.name)) el.remove();
    for (const [name, t] of wanted) {
      let el = box.querySelector(`[data-name="${CSS.escape(name)}"]`);
      if (!el) { el = document.createElement('span'); el.className = 'player-tag'; el.dataset.name = name; box.appendChild(el); }
      if (el.textContent !== t.text) el.textContent = t.text;
      el.classList.toggle('host', !!t.host);
      el.classList.toggle('asleep', !!t.asleep);
      el.style.left = `${(t.x / W) * 100}%`;
      el.style.top = `${((FEET_Y - 32 + G.platY) / H) * 100}%`;
    }
  }

  // ------------------------------------------------------------- the bar --
  // A strip under the HUD that appears when visiting or when friends drop by.
  let lastHostOn = null;
  function renderBar() {
    const bar = $('#social-bar');
    if (!bar) return;
    const guests = [...others.keys()];
    if (!G.visit && !guests.length) { bar.hidden = true; return; }
    bar.hidden = false;
    const hostOn = G.visit && others.has(G.visit.host);
    // the host just arrived or left: refresh the "N on" count on the Friends button
    if (G.visit && hostOn !== lastHostOn) Online.refreshFriends();
    lastHostOn = hostOn;
    const who = G.visit
      ? `Visiting <b>@${escapeHTML(G.visit.host)}</b>'s world <span class="status-chip ${hostOn ? 'on' : ''}">${hostOn ? 'Online' : 'Offline, napping'}</span>`
      : `${guests.map(n => `<b>@${escapeHTML(n)}</b>`).join(', ')} ${guests.length === 1 ? 'is' : 'are'} fishing with you!`;
    bar.innerHTML = `<span class="social-who">${who}</span>
      <span class="social-actions">
        <button class="btn" data-social="wave">Wave</button>
        <button class="btn" data-social="heart">Heart</button>
        ${G.visit ? `<button class="btn mint" data-social="tank">Their tank</button>
        <button class="btn gold" data-social="gift">Gift</button>
        <button class="btn plain" data-social="home">Go home</button>` : ''}
      </span>`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-social]');
    if (!b) return;
    const act = b.dataset.social;
    if (act === 'wave' || act === 'heart') emote(act);
    if (act === 'home') goHome();
    if (act === 'tank' && G.visit) openTank({ owner: G.visit.host, fish: G.visit.aquarium });
    if (act === 'gift' && G.visit) Online.openGift(G.visit.host);
    b.blur();
  });

  return {
    connect, disconnect, reset, send, tick, visit, goHome, emote,
    drawPlayers, drawLines, renderBar,
    home: () => connect(Online.username()),
    room: () => room,
    count: () => others.size,
  };
})();
