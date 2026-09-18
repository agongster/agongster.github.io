// Picture Battleship: Grid Hunter
// A 2-player local turn-based guessing game powered by the keyless
// Picsum Photos API (https://picsum.photos/). No build step, no framework —
// plain DOM + CSS (background-position slicing, CSS filters for reveal tiers).
//
// Players build each other's board: you pick your opponent's real target
// photo (from a pool of 20) plus 7 decoys, and secretly place a fleet of
// ships on the 12x12 grid they'll fire at blind. Then you take turns firing
// on your OWN board (the one they built for you) — a hit keeps your turn
// going, a miss passes it. There's no ammo choice — every tile's look is
// determined automatically by whether it's a miss, an unsunk ship hit, or
// part of a fully sunk ship, recomputed live so previously-revealed tiles
// update as you land more hits on the same ship.

(function () {
  "use strict";

  // ---------------------------------------------------------------- theme
  const themeToggle = document.querySelector(".theme-toggle");
  function setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.textContent = isDark ? "☀ Day mode" : "🌙 Night mode";
  }
  setTheme(localStorage.getItem("theme") || "dark");
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  });

  // ------------------------------------------------------------- constants
  const GRID_SIZE = 12;
  const CORRECT_BASE_POINTS = 100;
  const POINTS_LOST_PER_TILE = 2;
  const WRONG_GUESS_PENALTY = 20;
  const NUM_DECOY_CHOICES = 7; // builder picks this many decoys, plus their chosen target = 8 shown to the solver
  const POOL_SIZE = 20; // photos shown to the builder to pick a target + decoys from
  const SHIP_HIT_PENALTY = 10; // points the ship's owner (builder) loses per hit cell
  const SHAKE_DURATION_MS = 400;

  const SHIP_FLEET = [
    { id: "cruiser", name: "Cruiser", length: 3, color: "#5fd8e6" },
    { id: "destroyer", name: "Destroyer", length: 3, color: "#9b8cf2" },
    { id: "frigate", name: "Frigate", length: 2, color: "#ffd166" },
    { id: "sub", name: "Submarine", length: 2, color: "#ff7eb3" },
    { id: "corvette", name: "Corvette", length: 2, color: "#ff9f5e" },
    { id: "scout", name: "Scout", length: 1, color: "#a0e6a0" },
  ];

  const IMAGE_LIST_URL = "https://picsum.photos/v2/list?page=1&limit=90";
  const TARGET_IMAGE_SIZE = 1000;
  const THUMB_IMAGE_SIZE = 220;
  const PRELOAD_TIMEOUT_MS = 9000;
  const FALLBACK_ID_POOL = Array.from({ length: 150 }, (_, i) => String(i));

  function targetImageUrl(id) {
    return `https://picsum.photos/id/${id}/${TARGET_IMAGE_SIZE}/${TARGET_IMAGE_SIZE}`;
  }
  function thumbImageUrl(id) {
    return `https://picsum.photos/id/${id}/${THUMB_IMAGE_SIZE}/${THUMB_IMAGE_SIZE}`;
  }

  // ----------------------------------------------------------------- dom
  const el = {
    player1Score: document.getElementById("player1-score"),
    player2Score: document.getElementById("player2-score"),
    player1Badge: document.getElementById("player1-badge"),
    player2Badge: document.getElementById("player2-badge"),
    turnIndicator: document.getElementById("turn-indicator"),
    statusBanner: document.getElementById("status-banner"),

    passGate: document.getElementById("pass-gate"),
    passGateHeading: document.getElementById("pass-gate-heading"),
    passGateDesc: document.getElementById("pass-gate-desc"),
    passGateContinueBtn: document.getElementById("pass-gate-continue-btn"),

    setupPanel: document.getElementById("setup-panel"),
    setupHeading: document.getElementById("setup-heading"),
    setupStepCandidates: document.getElementById("setup-step-candidates"),
    setupStepShips: document.getElementById("setup-step-ships"),
    candidateHint: document.getElementById("candidate-hint"),
    candidatePoolGrid: document.getElementById("candidate-pool-grid"),
    decoyCountLabel: document.getElementById("decoy-count-label"),
    autoPickDecoysBtn: document.getElementById("auto-pick-decoys-btn"),
    candidatesNextBtn: document.getElementById("candidates-next-btn"),
    shipTray: document.getElementById("ship-tray"),
    placementGrid: document.getElementById("placement-grid"),
    shuffleShipsBtn: document.getElementById("shuffle-ships-btn"),
    confirmSetupBtn: document.getElementById("confirm-setup-btn"),

    playPanel: document.getElementById("play-panel"),
    tileGrid: document.getElementById("tile-grid"),
    guessBtn: document.getElementById("guess-btn"),
    passBtn: document.getElementById("pass-btn"),
    guessPanel: document.getElementById("guess-panel"),
    guessCandidates: document.getElementById("guess-candidates"),

    restartBtn: document.getElementById("restart-btn"),
    victoryModal: document.getElementById("victory-modal"),
    confettiLayer: document.getElementById("confetti-layer"),
    victoryResult: document.getElementById("victory-result"),
    victoryScores: document.getElementById("victory-scores"),
    playAgainBtn: document.getElementById("play-again-btn"),
  };

  // ---------------------------------------------------------------- state

  function freshBoard() {
    return {
      targetId: null,
      targetOk: null, // null = not chosen/loading yet, true/false once resolved
      poolImages: [], // [{ id, ok }]
      candidates: [], // finalized 8, shuffled: [{ id, ok }]
      ships: [], // [{ id, name, cells: [[r,c], ...], orientation, hitCells: Set<"r-c"> }]
      revealedTiles: new Set(),
      resolved: false,
      solved: false,
    };
  }

  function freshState() {
    return {
      players: [
        { name: "Player 1", score: 0 },
        { name: "Player 2", score: 0 },
      ],
      startingPlayerIdx: Math.random() < 0.5 ? 0 : 1,
      currentPlayerIdx: 0,
      boards: [freshBoard(), freshBoard()], // boards[i] is solved by player i, built by player (1 - i)
      awaitingGuessDecision: false,
      lastRevealWasHit: false,
      gameOver: false,

      // setup sub-state
      setupBuilderIdx: null, // which player is currently building (for the OTHER player's board)
      setupTargetIndex: null, // pool index the builder has designated as the real target
      setupSelectedDecoyIndices: null, // Set of pool indices chosen as decoys this build
      setupRequiredDecoys: NUM_DECOY_CHOICES,
      setupShipsPlaced: null, // [{ id, name, cells, orientation }] in progress
      setupArmedShipId: null,
    };
  }
  let state = freshState();

  // ------------------------------------------------------------- helpers

  function shuffled(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = url;
      setTimeout(() => finish(false), PRELOAD_TIMEOUT_MS);
    });
  }

  async function fetchIdPool() {
    try {
      const resp = await fetch(IMAGE_LIST_URL);
      if (!resp.ok) throw new Error(`Picsum list request failed: ${resp.status}`);
      const data = await resp.json();
      const ids = Array.isArray(data) ? data.map((item) => String(item.id)).filter(Boolean) : [];
      if (ids.length >= POOL_SIZE * 2) return ids;
      throw new Error("Picsum list returned too few images");
    } catch (err) {
      console.warn("Falling back to built-in image id pool:", err);
      return FALLBACK_ID_POOL;
    }
  }

  function otherPlayer(idx) {
    return 1 - idx;
  }

  // -------------------------------------------------------------- render

  function updateScoreboard() {
    el.player1Score.textContent = state.players[0].score;
    el.player2Score.textContent = state.players[1].score;
  }

  function clearActiveBadges() {
    el.player1Badge.classList.remove("is-active");
    el.player2Badge.classList.remove("is-active");
  }

  function showStatus(message) {
    el.statusBanner.textContent = message;
  }

  function showOnly(panelKey) {
    const panels = { passGate: el.passGate, setupPanel: el.setupPanel, playPanel: el.playPanel };
    Object.keys(panels).forEach((key) => {
      panels[key].hidden = key !== panelKey;
    });
  }

  // ---------------------------------------------------------------- setup

  async function beginSetup() {
    state.boards = [freshBoard(), freshBoard()];
    showOnly("setupPanel");
    el.setupPanel.hidden = true; // keep hidden while loading
    el.turnIndicator.textContent = "Preparing the boards…";
    showStatus("Fetching photos from Picsum for both boards…");
    clearActiveBadges();
    updateScoreboard();

    const ids = shuffled(await fetchIdPool());
    const idsForBoard0 = ids.slice(0, POOL_SIZE);
    const idsForBoard1 = ids.slice(POOL_SIZE, POOL_SIZE * 2);

    await Promise.all([
      loadBoardPool(state.boards[0], idsForBoard0),
      loadBoardPool(state.boards[1], idsForBoard1),
    ]);

    showStatus("Boards ready. Time to build each other's puzzle!");
    startBuilderPhase(0); // Player 1 builds board for Player 2 first
  }

  async function loadBoardPool(board, ids) {
    const poolResults = await Promise.all(
      ids.map(async (id) => ({ id, ok: await preloadImage(thumbImageUrl(id)) }))
    );
    board.poolImages = poolResults;
  }

  // ------------------------------------------------------- builder: gate

  function startBuilderPhase(builderIdx) {
    state.setupBuilderIdx = builderIdx;
    state.setupTargetIndex = null;
    state.setupSelectedDecoyIndices = new Set();
    state.setupShipsPlaced = randomFleetPlacement();

    const builderName = state.players[builderIdx].name;
    const solverName = state.players[otherPlayer(builderIdx)].name;

    el.passGateHeading.textContent = `Pass the device to ${builderName}`;
    el.passGateDesc.textContent = `${builderName} will secretly build ${solverName}'s board: pick their real target photo, choose decoys, and hide a fleet on their grid. ${solverName}, don't peek!`;
    showOnly("passGate");
    el.turnIndicator.textContent = `${builderName} is building ${solverName}'s board`;
    clearActiveBadges();
    updateScoreboard();
  }

  el.passGateContinueBtn.addEventListener("click", () => {
    showOnly("setupPanel");
    el.setupPanel.hidden = false;
    renderCandidateStep();
  });

  // ------------------------------------------------- builder: candidates

  function targetBoard() {
    return state.boards[otherPlayer(state.setupBuilderIdx)];
  }

  function renderCandidateStep() {
    const board = targetBoard();
    const builderName = state.players[state.setupBuilderIdx].name;
    const solverName = state.players[otherPlayer(state.setupBuilderIdx)].name;
    el.setupHeading.textContent = `${builderName}: Build ${solverName}'s Board`;
    el.setupStepCandidates.hidden = false;
    el.setupStepShips.hidden = true;

    if (state.setupTargetIndex === null) {
      el.candidateHint.innerHTML = "Click a photo below to make it the <strong>real target</strong> your opponent has to guess.";
    } else if (board.targetOk === null) {
      el.candidateHint.textContent = "Loading the target image…";
    } else {
      const validDecoyCount = board.poolImages.filter((p, i) => i !== state.setupTargetIndex && p.ok).length;
      state.setupRequiredDecoys = Math.max(0, Math.min(NUM_DECOY_CHOICES, validDecoyCount));
      el.candidateHint.innerHTML = `The gold-starred photo is locked in as the target. Pick <strong>${state.setupRequiredDecoys}</strong> more decoys — ones that look similar make it harder to guess! (Click the target again to change your mind.)`;
    }

    el.candidatePoolGrid.innerHTML = "";
    board.poolImages.forEach((entry, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pool-thumb";
      const isTarget = index === state.setupTargetIndex;
      if (isTarget) {
        btn.classList.add("is-target");
        btn.setAttribute("aria-label", "Real target photo (click again to unset)");
      } else {
        btn.setAttribute("aria-label", `Candidate photo ${index + 1}`);
      }
      if (!entry.ok) {
        btn.classList.add("mode-error");
        btn.textContent = "Image\nunavailable";
        btn.disabled = true;
      } else {
        btn.style.backgroundImage = `url("${thumbImageUrl(entry.id)}")`;
      }
      if (isTarget) {
        const star = document.createElement("span");
        star.className = "target-star";
        star.textContent = "★";
        btn.appendChild(star);
        if (board.targetOk === null) btn.classList.add("is-loading");
      }
      btn.addEventListener("click", () => onPoolThumbClick(index));
      el.candidatePoolGrid.appendChild(btn);
    });

    updateCandidateSelectionUI();
  }

  function onPoolThumbClick(index) {
    const board = targetBoard();
    const entry = board.poolImages[index];
    if (!entry.ok) return;

    if (state.setupTargetIndex === index) {
      // unset target
      state.setupTargetIndex = null;
      board.targetId = null;
      board.targetOk = null;
      state.setupSelectedDecoyIndices = new Set();
      renderCandidateStep();
      return;
    }

    if (state.setupTargetIndex === null) {
      chooseTarget(index);
      return;
    }

    toggleDecoy(index);
  }

  async function chooseTarget(index) {
    const board = targetBoard();
    state.setupTargetIndex = index;
    board.targetId = board.poolImages[index].id;
    board.targetOk = null; // loading
    state.setupSelectedDecoyIndices = new Set();
    renderCandidateStep();

    const ok = await preloadImage(targetImageUrl(board.targetId));
    // the builder may have changed their mind (or we moved to a different board) while this loaded
    if (state.setupTargetIndex === index && targetBoard() === board) {
      board.targetOk = ok;
      renderCandidateStep();
    }
  }

  function toggleDecoy(index) {
    const board = targetBoard();
    if (index === state.setupTargetIndex) return;
    if (!board.poolImages[index].ok) return;
    const selected = state.setupSelectedDecoyIndices;
    if (selected.has(index)) {
      selected.delete(index);
    } else if (selected.size < state.setupRequiredDecoys) {
      selected.add(index);
    }
    updateCandidateSelectionUI();
  }

  function updateCandidateSelectionUI() {
    const board = targetBoard();
    const buttons = Array.from(el.candidatePoolGrid.children);
    buttons.forEach((btn, index) => {
      btn.classList.toggle("is-selected", state.setupSelectedDecoyIndices.has(index));
    });
    const count = state.setupSelectedDecoyIndices.size;
    const targetChosen = state.setupTargetIndex !== null;
    const targetReady = targetChosen && board.targetOk !== null;
    el.decoyCountLabel.textContent = targetChosen ? `${count} / ${state.setupRequiredDecoys} decoys selected` : "No target chosen yet";
    el.candidatesNextBtn.disabled = !targetReady || count < state.setupRequiredDecoys;
  }

  el.autoPickDecoysBtn.addEventListener("click", async () => {
    let board = targetBoard();
    if (state.setupTargetIndex === null) {
      const validIndices = board.poolImages.map((e, i) => ({ e, i })).filter(({ e }) => e.ok).map(({ i }) => i);
      if (validIndices.length === 0) return;
      const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      await chooseTarget(randomIndex);
      board = targetBoard();
    }
    const validDecoyIndices = board.poolImages
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry, index }) => index !== state.setupTargetIndex && entry.ok)
      .map(({ index }) => index);
    state.setupSelectedDecoyIndices = new Set(shuffled(validDecoyIndices).slice(0, state.setupRequiredDecoys));
    renderCandidateStep();
  });

  el.candidatesNextBtn.addEventListener("click", () => {
    const board = targetBoard();
    const chosen = [board.poolImages[state.setupTargetIndex], ...Array.from(state.setupSelectedDecoyIndices).map((i) => board.poolImages[i])];
    board.candidates = shuffled(chosen);
    el.setupStepCandidates.hidden = true;
    el.setupStepShips.hidden = false;
    renderShipStep();
  });

  // ------------------------------------------------------ builder: ships

  function computeShipCells(row, col, length, orientation) {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const r = orientation === "vertical" ? row + i : row;
      const c = orientation === "horizontal" ? col + i : col;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
      cells.push([r, c]);
    }
    return cells;
  }

  function cellsOverlapExisting(cells, excludeId) {
    const occupied = new Set();
    state.setupShipsPlaced.forEach((ship) => {
      if (ship.id === excludeId) return;
      ship.cells.forEach(([r, c]) => occupied.add(`${r}-${c}`));
    });
    return cells.some(([r, c]) => occupied.has(`${r}-${c}`));
  }

  // Randomly places the whole fleet with no overlaps, used both for the
  // initial layout and the Shuffle button.
  function randomFleetPlacement() {
    const placed = [];
    const overlaps = (cells) => {
      const occupied = new Set();
      placed.forEach((ship) => ship.cells.forEach(([r, c]) => occupied.add(`${r}-${c}`)));
      return cells.some(([r, c]) => occupied.has(`${r}-${c}`));
    };
    SHIP_FLEET.forEach((ship) => {
      let attempts = 0;
      let done = false;
      while (!done && attempts < 300) {
        attempts++;
        const orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        const cells = computeShipCells(row, col, ship.length, orientation);
        if (cells && !overlaps(cells)) {
          placed.push({ id: ship.id, name: ship.name, color: ship.color, cells, orientation });
          done = true;
        }
      }
    });
    return placed;
  }

  function renderShipStep() {
    renderShipTray();
    renderPlacementGrid();
    el.confirmSetupBtn.disabled = false; // the fleet is always fully placed now
  }

  function renderShipTray() {
    el.shipTray.innerHTML = "";
    SHIP_FLEET.forEach((ship) => {
      const item = document.createElement("div");
      item.className = "ship-tray-item";
      item.innerHTML = `<span class="ship-tray-swatch" style="background-color: ${ship.color}"></span><span class="ship-tray-name">${ship.name}</span><span class="ship-tray-cells">${"■".repeat(ship.length)}</span>`;
      el.shipTray.appendChild(item);
    });
  }

  function renderPlacementGrid() {
    el.placementGrid.innerHTML = "";
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "placement-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute("aria-label", `Grid cell row ${row + 1}, column ${col + 1}`);
        cell.addEventListener("pointerdown", (e) => onPlacementPointerDown(e, row, col));
        el.placementGrid.appendChild(cell);
      }
    }
    repaintPlacementGrid();
  }

  // `preview` (optional): { shipId, cells, valid } — while dragging, shows the
  // dragged ship at its candidate position instead of its committed one.
  function repaintPlacementGrid(preview) {
    const cellEls = Array.from(el.placementGrid.children);
    cellEls.forEach((c) => {
      c.classList.remove("has-ship", "drag-invalid");
      c.style.backgroundColor = "";
    });
    state.setupShipsPlaced.forEach((ship) => {
      if (preview && preview.shipId === ship.id) return;
      ship.cells.forEach(([r, c]) => {
        const cellEl = el.placementGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (cellEl) {
          cellEl.classList.add("has-ship");
          cellEl.style.backgroundColor = ship.color;
        }
      });
    });
    if (preview) {
      const previewShip = state.setupShipsPlaced.find((s) => s.id === preview.shipId);
      preview.cells.forEach(([r, c]) => {
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
        const cellEl = el.placementGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!cellEl) return;
        if (preview.valid) {
          cellEl.classList.add("has-ship");
          cellEl.style.backgroundColor = previewShip.color;
        } else {
          cellEl.classList.add("drag-invalid");
        }
      });
    }
  }

  // Ships are always fully placed (randomly, on entry) — the board is only
  // ever for rearranging: drag a ship to move it, or click one without
  // moving to rotate it in place around its anchor cell.
  let shipDragState = null;

  function placementCellFromPoint(clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    const cell = hit && hit.closest ? hit.closest(".placement-cell") : null;
    if (!cell) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  }

  function onPlacementPointerDown(e, row, col) {
    const ship = state.setupShipsPlaced.find((s) => s.cells.some(([r, c]) => r === row && c === col));
    if (!ship) return;
    e.preventDefault();
    shipDragState = {
      shipId: ship.id,
      startRow: row,
      startCol: col,
      originalCells: ship.cells.map((c) => c.slice()),
      moved: false,
      candidateCells: null,
      valid: false,
    };
    window.addEventListener("pointermove", onPlacementPointerMove);
    window.addEventListener("pointerup", onPlacementPointerUp, { once: true });
  }

  function onPlacementPointerMove(e) {
    if (!shipDragState) return;
    const pos = placementCellFromPoint(e.clientX, e.clientY);
    if (!pos) return;
    const dRow = pos.row - shipDragState.startRow;
    const dCol = pos.col - shipDragState.startCol;
    const candidateCells = shipDragState.originalCells.map(([r, c]) => [r + dRow, c + dCol]);
    const unchanged =
      shipDragState.candidateCells &&
      candidateCells.every(([r, c], i) => shipDragState.candidateCells[i][0] === r && shipDragState.candidateCells[i][1] === c);
    if (unchanged) return;

    shipDragState.moved = dRow !== 0 || dCol !== 0;
    const inBounds = candidateCells.every(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);
    const valid = inBounds && !cellsOverlapExisting(candidateCells, shipDragState.shipId);
    shipDragState.candidateCells = candidateCells;
    shipDragState.valid = valid;
    repaintPlacementGrid({ shipId: shipDragState.shipId, cells: candidateCells, valid });
  }

  function onPlacementPointerUp() {
    window.removeEventListener("pointermove", onPlacementPointerMove);
    if (!shipDragState) return;
    const ship = state.setupShipsPlaced.find((s) => s.id === shipDragState.shipId);

    if (shipDragState.moved) {
      if (shipDragState.valid) {
        ship.cells = shipDragState.candidateCells;
        showStatus(`${ship.name} moved.`);
      } else {
        showStatus(`${ship.name} can't go there — try a different spot.`);
      }
    } else {
      const fleetShip = SHIP_FLEET.find((f) => f.id === ship.id);
      const [anchorRow, anchorCol] = ship.cells[0];
      const newOrientation = ship.orientation === "horizontal" ? "vertical" : "horizontal";
      const newCells = computeShipCells(anchorRow, anchorCol, fleetShip.length, newOrientation);
      if (newCells && !cellsOverlapExisting(newCells, ship.id)) {
        ship.cells = newCells;
        ship.orientation = newOrientation;
        showStatus(`${ship.name} rotated to ${newOrientation}.`);
      } else {
        showStatus(`${ship.name} can't rotate there — not enough room.`);
      }
    }

    shipDragState = null;
    repaintPlacementGrid();
  }

  el.shuffleShipsBtn.addEventListener("click", () => {
    state.setupShipsPlaced = randomFleetPlacement();
    showStatus("Fleet reshuffled. Drag a ship to move it, or click one to rotate it.");
    repaintPlacementGrid();
  });

  el.confirmSetupBtn.addEventListener("click", () => {
    const board = targetBoard();
    board.ships = state.setupShipsPlaced.map((s) => ({ id: s.id, name: s.name, cells: s.cells, hitCells: new Set() }));

    if (state.setupBuilderIdx === 0) {
      startBuilderPhase(1);
    } else {
      beginPlayPhase();
    }
  });

  // ------------------------------------------------------------- play phase

  function beginPlayPhase() {
    state.currentPlayerIdx = state.startingPlayerIdx;
    state.awaitingGuessDecision = false;
    showOnly("playPanel");
    buildTileGridOnce();
    showStatus("Setup complete! Time to fire on your own board.");
    startPlayerTurn();
  }

  function buildTileGridOnce() {
    el.tileGrid.innerHTML = "";
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tile-btn";
        btn.dataset.row = String(row);
        btn.dataset.col = String(col);
        btn.setAttribute("aria-label", `Grid tile row ${row + 1}, column ${col + 1}, hidden`);
        const q = document.createElement("span");
        q.className = "tile-question";
        q.textContent = "?";
        btn.appendChild(q);
        const badge = document.createElement("span");
        badge.className = "ship-hit-badge";
        badge.textContent = "💥";
        badge.hidden = true;
        btn.appendChild(badge);
        btn.addEventListener("click", () => onTileClick(row, col));
        el.tileGrid.appendChild(btn);
      }
    }
  }

  function currentBoard() {
    return state.boards[state.currentPlayerIdx];
  }

  // A tile's visual treatment is derived live from ship state every render,
  // so previously-revealed cells of a ship visually upgrade the moment that
  // ship becomes fully sunk (no separate "reveal mode" is ever stored).
  function tileVisualTier(board, row, col) {
    const ship = board.ships.find((s) => s.cells.some(([r, c]) => r === row && c === col));
    if (!ship) return "miss";
    const sunk = ship.cells.every(([r, c]) => ship.hitCells.has(`${r}-${c}`));
    return sunk ? "sunk" : "hit";
  }

  function renderBoardOntoGrid() {
    const board = currentBoard();
    Array.from(el.tileGrid.children).forEach((btn) => {
      const row = Number(btn.dataset.row);
      const col = Number(btn.dataset.col);
      const key = `${row}-${col}`;
      btn.className = "tile-btn";
      btn.style.backgroundImage = "";
      const q = btn.querySelector(".tile-question");
      const badge = btn.querySelector(".ship-hit-badge");

      if (board.revealedTiles.has(key)) {
        btn.classList.add("is-revealed");
        btn.disabled = true;
        if (board.targetOk) {
          btn.style.backgroundImage = `url("${targetImageUrl(board.targetId)}")`;
          btn.style.backgroundSize = `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`;
          btn.style.backgroundPosition = `${(col * 100) / (GRID_SIZE - 1)}% ${(row * 100) / (GRID_SIZE - 1)}%`;
          q.textContent = "";
          btn.classList.add(`tier-${tileVisualTier(board, row, col)}`);
        } else {
          btn.classList.add("mode-error");
          q.textContent = "!";
        }
        badge.hidden = !wasShipHitAt(board, row, col);
      } else {
        btn.disabled = false;
        q.textContent = "?";
        badge.hidden = true;
      }
    });
  }

  function wasShipHitAt(board, row, col) {
    const key = `${row}-${col}`;
    return board.ships.some((ship) => ship.hitCells.has(key));
  }

  function setGridLocked(locked) {
    el.tileGrid.classList.toggle("grid-locked", locked);
  }

  function renderCandidatesForCurrentPlayer() {
    const board = currentBoard();
    el.guessCandidates.innerHTML = "";
    board.candidates.forEach((candidate) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "candidate-btn";
      if (candidate.ok) {
        btn.style.backgroundImage = `url("${thumbImageUrl(candidate.id)}")`;
      } else {
        btn.classList.add("mode-error");
        btn.textContent = "Image\nunavailable";
      }
      btn.setAttribute("aria-label", "Guess this image");
      btn.addEventListener("click", () => onGuessSelected(candidate.id));
      el.guessCandidates.appendChild(btn);
    });
  }

  function startPlayerTurn() {
    const idx = state.currentPlayerIdx;
    const board = state.boards[idx];

    if (board.resolved) {
      advanceTurnPointer();
      return;
    }

    state.awaitingGuessDecision = false;
    el.guessPanel.hidden = true;
    el.guessBtn.disabled = true;
    el.passBtn.disabled = true;
    el.passBtn.textContent = "Pass Turn";
    setGridLocked(false);
    renderBoardOntoGrid();
    updateScoreboard();

    const player = state.players[idx];
    el.turnIndicator.textContent = `${player.name}’s turn — fire on your own board`;
    el.player1Badge.classList.toggle("is-active", idx === 0);
    el.player2Badge.classList.toggle("is-active", idx === 1);
    showStatus(`${player.name}: choose a tile to fire on.`);
  }

  function onTileClick(row, col) {
    if (state.gameOver) return;
    if (state.awaitingGuessDecision) {
      showStatus("Resolve your current guess decision first.");
      return;
    }
    const board = currentBoard();
    const key = `${row}-${col}`;
    if (board.revealedTiles.has(key)) return;

    board.revealedTiles.add(key);

    let hitMessage = "";
    let wasHit = false;
    board.ships.forEach((ship) => {
      const isThisCell = ship.cells.some(([r, c]) => r === row && c === col);
      if (isThisCell && !ship.hitCells.has(key)) {
        wasHit = true;
        ship.hitCells.add(key);
        const owner = state.players[otherPlayer(state.currentPlayerIdx)];
        owner.score -= SHIP_HIT_PENALTY;
        const sunk = ship.cells.every(([r, c]) => ship.hitCells.has(`${r}-${c}`));
        hitMessage = sunk
          ? ` 💥 Direct hit — you sank ${owner.name}'s ${ship.name}! (-${SHIP_HIT_PENALTY} for them)`
          : ` 💥 Direct hit on ${owner.name}'s ${ship.name}! (-${SHIP_HIT_PENALTY} for them)`;
      }
    });

    state.lastRevealWasHit = wasHit;
    renderBoardOntoGrid();
    updateScoreboard();

    if (wasHit) {
      const tileBtn = el.tileGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      if (tileBtn) {
        tileBtn.classList.add("shake");
        setTimeout(() => tileBtn.classList.remove("shake"), SHAKE_DURATION_MS);
      }
    }

    state.awaitingGuessDecision = true;
    el.guessBtn.disabled = false;
    el.passBtn.disabled = false;
    el.passBtn.textContent = wasHit ? "Fire Again" : "Pass Turn";
    setGridLocked(true);
    const tier = tileVisualTier(board, row, col);
    const baseMsg =
      tier === "miss"
        ? "Miss — a maximally blurry, grayscale glimpse revealed."
        : tier === "hit"
        ? "You grazed a ship — a slightly less blurry (still grayscale) glimpse revealed."
        : "Ship fully sunk on this shot — its tiles stay grayscale, but a little sharper!";
    const continueHint = wasHit ? " Guess now, or fire again." : " Guess now, or pass the turn.";
    showStatus(`${baseMsg}${hitMessage}${continueHint}`);
  }

  el.guessBtn.addEventListener("click", () => {
    if (!state.awaitingGuessDecision) return;
    renderCandidatesForCurrentPlayer();
    el.guessPanel.hidden = false;
    el.guessBtn.disabled = true;
    el.passBtn.disabled = true;
    showStatus("Pick the thumbnail you believe matches your hidden image.");
  });

  function onGuessSelected(guessedId) {
    if (!state.awaitingGuessDecision) return;
    const board = currentBoard();
    const player = state.players[state.currentPlayerIdx];
    el.guessPanel.hidden = true;
    state.awaitingGuessDecision = false;

    if (String(guessedId) === String(board.targetId)) {
      const points = Math.max(0, CORRECT_BASE_POINTS - POINTS_LOST_PER_TILE * board.revealedTiles.size);
      player.score += points;
      board.resolved = true;
      board.solved = true;
      showStatus(`${player.name} guessed correctly! +${points} points. Your board is solved.`);
    } else {
      player.score -= WRONG_GUESS_PENALTY;
      showStatus(`${player.name} guessed wrong. -${WRONG_GUESS_PENALTY} points. Turn passes.`);
    }
    updateScoreboard();
    // A wrong guess always ends the turn, even mid hit-streak — guessing wrong has a real cost.
    resolveAfterShot(true);
  }

  el.passBtn.addEventListener("click", () => {
    if (!state.awaitingGuessDecision) return;
    state.awaitingGuessDecision = false;
    if (state.lastRevealWasHit) {
      showStatus("Hit! You keep firing.");
      resolveAfterShot(false);
    } else {
      showStatus("Turn passed.");
      resolveAfterShot(true);
    }
  });

  // Shared end-of-shot bookkeeping: checks for board exhaustion and a
  // finished game, then either switches the active player or lets them
  // keep firing on the same board (the "hit streak" rule).
  function resolveAfterShot(switchPlayer) {
    const board = currentBoard();
    if (!board.solved && board.revealedTiles.size >= GRID_SIZE * GRID_SIZE) {
      board.resolved = true;
      showStatus(`${state.players[state.currentPlayerIdx].name}'s board is fully revealed with no correct guess.`);
    }

    if (state.boards[0].resolved && state.boards[1].resolved) {
      endGame();
      return;
    }

    if (switchPlayer) {
      advanceTurnPointer();
    } else {
      startPlayerTurn();
    }
  }

  function advanceTurnPointer() {
    const idx = state.currentPlayerIdx;
    const other = otherPlayer(idx);
    if (!state.boards[other].resolved) {
      state.currentPlayerIdx = other;
    }
    startPlayerTurn();
  }

  // ---------------------------------------------------------------- end

  function endGame() {
    state.gameOver = true;
    const [p1, p2] = state.players;
    let winnerIdx = null;
    let result;
    if (p1.score > p2.score) {
      result = `${p1.name} Wins!`;
      winnerIdx = 0;
    } else if (p2.score > p1.score) {
      result = `${p2.name} Wins!`;
      winnerIdx = 1;
    } else {
      result = "It's a Tie!";
    }

    el.victoryResult.textContent = result;
    el.victoryResult.classList.toggle("is-winner", winnerIdx !== null);
    el.victoryScores.innerHTML = "";
    state.players.forEach((p, idx) => {
      const line = document.createElement("p");
      line.textContent = `${p.name}: ${p.score} pts`;
      line.classList.toggle("is-winner-line", idx === winnerIdx);
      el.victoryScores.appendChild(line);
    });
    spawnConfetti(winnerIdx !== null);
    showStatus("Game over.");
    el.turnIndicator.textContent = "Game over";
    el.victoryModal.hidden = false;
  }

  function spawnConfetti(celebrate) {
    el.confettiLayer.innerHTML = "";
    if (!celebrate) return;
    const colors = ["#5fd8e6", "#8fe6f0", "#ffd166", "#ff7eb3", "#a0e6a0"];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${(Math.random() * 0.6).toFixed(2)}s`;
      piece.style.animationDuration = `${(1.4 + Math.random() * 1.2).toFixed(2)}s`;
      piece.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
      el.confettiLayer.appendChild(piece);
    }
  }

  // -------------------------------------------------------------- restart

  function resetGame() {
    const hasProgress = state.players.some((p) => p.score !== 0);
    if (hasProgress && !state.gameOver) {
      const confirmed = window.confirm("Restart the game? Current scores and progress will be lost.");
      if (!confirmed) return;
    }
    state = freshState();
    el.victoryModal.hidden = true;
    el.confettiLayer.innerHTML = "";
    updateScoreboard();
    beginSetup();
  }

  el.restartBtn.addEventListener("click", resetGame);
  el.playAgainBtn.addEventListener("click", () => {
    el.victoryModal.hidden = true;
    el.confettiLayer.innerHTML = "";
    state = freshState();
    updateScoreboard();
    beginSetup();
  });

  // -------------------------------------------------------------- start

  updateScoreboard();
  beginSetup();
})();
