/* Tally — frontend for the shared-expense API.
 *
 * This file is the entire client: it holds no secrets, does no maths that the
 * server doesn't independently redo, and talks to the backend over plain fetch
 * with a bearer token. Everything about money and permissions is decided
 * server-side; this page only renders what it is told and collects input.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// The deployed backend. Running the page from localhost automatically points at
// a local uvicorn instead, so development doesn't hit the live database.
const PRODUCTION_API = "https://tally-backend-lusl.onrender.com";
const LOCAL_API = "http://127.0.0.1:8000";

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = isLocal ? LOCAL_API : PRODUCTION_API;

const TOKEN_KEY = "tally.token";

// ---------------------------------------------------------------------------
// Theme toggle (same behaviour as the rest of the portfolio)
// ---------------------------------------------------------------------------

const themeToggle = document.querySelector(".theme-toggle");
function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.textContent = isDark ? "☀ Day mode" : "🌙 Night mode";
}
setTheme(localStorage.getItem("theme") || "dark");
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  setTheme(next);
});

// ---------------------------------------------------------------------------
// Tiny DOM helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const money = (value) =>
  `${value < 0 ? "−" : ""}$${Math.abs(value).toFixed(2)}`;

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/** Parse a YYYY-MM-DD date without letting the browser shift it by a timezone. */
function formatDay(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function toast(message, kind = "info") {
  const stack = $("toast-stack");
  const node = document.createElement("div");
  node.className = `toast toast-${kind}`;
  node.textContent = message;
  stack.appendChild(node);
  // A burst of actions shouldn't stack messages up the whole screen.
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(() => {
    node.classList.add("leaving");
    setTimeout(() => node.remove(), 400);
  }, 4200);
}

// ---------------------------------------------------------------------------
// API layer
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let inFlight = 0;
let wakeTimer = null;

function startRequest() {
  inFlight += 1;
  if (wakeTimer === null) {
    // Render's free tier spins down when idle. Rather than looking frozen, say
    // so — but only if the request is actually slow, so a fast one shows nothing.
    wakeTimer = setTimeout(() => {
      if (inFlight > 0) $("wake-banner").hidden = false;
    }, 1800);
  }
}

function endRequest() {
  inFlight = Math.max(0, inFlight - 1);
  if (inFlight === 0) {
    clearTimeout(wakeTimer);
    wakeTimer = null;
    $("wake-banner").hidden = true;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function api(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = {};
  if (body !== null) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    // The token is the only credential the browser holds. It goes in a header,
    // not a cookie, which is why the API can stay on a different origin without
    // any cross-site cookie configuration.
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  startRequest();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    endRequest();
    throw new ApiError(
      "Couldn't reach the server. It may still be waking up — try again in a moment.",
      0
    );
  }
  endRequest();

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && getToken()) {
      // An expired or invalidated token: drop it and send them back to sign in.
      localStorage.removeItem(TOKEN_KEY);
      state.user = null;
      showView("auth");
    }
    throw new ApiError(readError(payload, response.status), response.status);
  }
  return payload;
}

/** FastAPI reports validation problems as a list; flatten either shape to a line. */
function readError(payload, status) {
  const detail = payload && payload.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "input";
    return `${field}: ${first.msg}`;
  }
  return `Something went wrong (${status}).`;
}

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

const state = {
  user: null,
  groups: [],
  group: null, // { detail, balances, expenses, settlements }
};

function showView(name) {
  for (const view of ["auth", "groups", "group"]) {
    $(`view-${view}`).hidden = view !== name;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Auth screen
// ---------------------------------------------------------------------------

$("api-link").href = `${API_BASE}/docs`;

function selectTab(which) {
  const loginActive = which === "login";
  $("tab-login").classList.toggle("is-active", loginActive);
  $("tab-register").classList.toggle("is-active", !loginActive);
  $("tab-login").setAttribute("aria-selected", String(loginActive));
  $("tab-register").setAttribute("aria-selected", String(!loginActive));
  $("login-form").hidden = !loginActive;
  $("register-form").hidden = loginActive;
}

$("tab-login").addEventListener("click", () => selectTab("login"));
$("tab-register").addEventListener("click", () => selectTab("register"));

async function signIn(path, body) {
  const result = await api(path, { method: "POST", body, auth: false });
  localStorage.setItem(TOKEN_KEY, result.access_token);
  state.user = result.user;
  await loadGroups();
  showView("groups");
  return result;
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await signIn("/api/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
    toast(`Welcome back, ${state.user.name}.`, "success");
  } catch (error) {
    toast(error.message, "error");
  }
});

$("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await signIn("/api/auth/register", {
      email: form.get("email"),
      name: form.get("name"),
      password: form.get("password"),
    });
    toast(`Account created. Welcome, ${state.user.name}.`, "success");
  } catch (error) {
    toast(error.message, "error");
  }
});

$("demo-button").addEventListener("click", async () => {
  // A throwaway account so the page can be tried without signing up. The random
  // suffix keeps repeat visits from colliding on the unique email index.
  const suffix = Math.random().toString(36).slice(2, 8);
  try {
    await signIn("/api/auth/register", {
      email: `demo-${suffix}@tally.example`,
      name: "Demo User",
      password: `demo-${suffix}-password`,
    });
    const group = await api("/api/groups", {
      method: "POST",
      body: { name: "Beach trip", description: "A sample group to poke at" },
    });
    await api(`/api/groups/${group.id}/expenses`, {
      method: "POST",
      body: { description: "Airbnb", amount: 420 },
    });
    await api(`/api/groups/${group.id}/expenses`, {
      method: "POST",
      body: { description: "Groceries", amount: 83.47 },
    });
    toast("Demo account ready — invite a second account to see debts appear.", "success");
    await openGroup(group.id);
  } catch (error) {
    toast(error.message, "error");
  }
});

$("sign-out").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  state.user = null;
  state.groups = [];
  state.group = null;
  selectTab("login");
  showView("auth");
  toast("Signed out.");
});

// ---------------------------------------------------------------------------
// Groups list
// ---------------------------------------------------------------------------

async function loadGroups() {
  state.groups = await api("/api/groups");
  renderGroups();
}

function renderGroups() {
  $("greeting").textContent = `Hello, ${state.user ? state.user.name : "there"}`;

  // "Owed to you" and "you owe" are summed across groups here purely for
  // display; each group's own number came from the server.
  let owed = 0;
  let owing = 0;
  for (const group of state.groups) {
    if (group.your_balance > 0) owed += group.your_balance;
    if (group.your_balance < 0) owing += -group.your_balance;
  }

  $("totals-row").innerHTML = `
    <div class="total-tile positive">
      <span class="total-label">You are owed</span>
      <span class="total-value">${money(owed)}</span>
    </div>
    <div class="total-tile negative">
      <span class="total-label">You owe</span>
      <span class="total-value">${money(owing)}</span>
    </div>
  `;

  const grid = $("group-grid");
  if (!state.groups.length) {
    grid.innerHTML = `<p class="empty">No groups yet. Make one below to get started.</p>`;
    return;
  }

  grid.innerHTML = state.groups
    .map((group) => {
      const balance = group.your_balance;
      const tone = balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral";
      const label =
        balance > 0
          ? `you are owed ${money(balance)}`
          : balance < 0
          ? `you owe ${money(-balance)}`
          : "all settled";
      return `
        <button class="group-card ${tone}" type="button" data-group="${group.id}">
          <h3>${escapeHtml(group.name)}</h3>
          <p class="group-card-description">${escapeHtml(group.description) || "&nbsp;"}</p>
          <p class="group-card-meta">
            ${group.member_count} member${group.member_count === 1 ? "" : "s"} ·
            <span class="group-card-balance">${label}</span>
          </p>
        </button>
      `;
    })
    .join("");

  for (const card of grid.querySelectorAll("[data-group]")) {
    card.addEventListener("click", () => openGroup(Number(card.dataset.group)));
  }
}

$("new-group-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const group = await api("/api/groups", {
      method: "POST",
      body: { name: form.get("name"), description: form.get("description") || "" },
    });
    event.target.reset();
    await loadGroups();
    toast(`Created “${group.name}”.`, "success");
    await openGroup(group.id);
  } catch (error) {
    toast(error.message, "error");
  }
});

$("back-to-groups").addEventListener("click", async () => {
  await loadGroups();
  showView("groups");
});

// ---------------------------------------------------------------------------
// Group detail
// ---------------------------------------------------------------------------

async function openGroup(groupId) {
  try {
    // Four independent reads, so fetch them at once rather than in sequence —
    // on a sleeping free-tier server the difference is very noticeable.
    const [detail, balances, expenses, settlements] = await Promise.all([
      api(`/api/groups/${groupId}`),
      api(`/api/groups/${groupId}/balances`),
      api(`/api/groups/${groupId}/expenses`),
      api(`/api/groups/${groupId}/settlements`),
    ]);
    state.group = { detail, balances, expenses, settlements };
    renderGroup();
    showView("group");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function refreshGroup() {
  if (state.group) await openGroup(state.group.detail.id);
}

function renderGroup() {
  const { detail, balances, expenses, settlements } = state.group;

  $("group-name").textContent = detail.name;
  $("group-description").textContent = detail.description || "";
  $("delete-group").hidden = detail.created_by !== state.user.id;

  renderDebts(balances);
  renderBalanceStrip(balances);
  renderActivity(expenses, settlements);
  renderMembers(detail);
  renderExpenseForm(detail);
}

function renderDebts(balances) {
  const container = $("debts");
  if (!balances.debts.length) {
    container.innerHTML = `<p class="empty settled">Everyone's square. 🎉</p>`;
    return;
  }

  container.innerHTML = balances.debts
    .map((debt) => {
      const youOwe = debt.from_user === state.user.id;
      const youAreOwed = debt.to_user === state.user.id;
      const mine = youOwe || youAreOwed;
      const text = youOwe
        ? `<strong>You owe ${escapeHtml(debt.to_user_name)}</strong>`
        : youAreOwed
        ? `<strong>${escapeHtml(debt.from_user_name)} owes you</strong>`
        : `${escapeHtml(debt.from_user_name)} owes ${escapeHtml(debt.to_user_name)}`;
      return `
        <div class="debt-row ${mine ? "mine" : ""} ${youOwe ? "owing" : ""}">
          <span class="debt-text">${text}</span>
          <span class="debt-amount">${money(debt.amount)}</span>
          <button
            class="ghost-button tiny"
            type="button"
            data-settle-from="${debt.from_user}"
            data-settle-to="${debt.to_user}"
            data-settle-amount="${debt.amount}"
          >
            Settle
          </button>
        </div>
      `;
    })
    .join("");

  for (const button of container.querySelectorAll("[data-settle-from]")) {
    button.addEventListener("click", () =>
      openSettleModal({
        from: Number(button.dataset.settleFrom),
        to: Number(button.dataset.settleTo),
        amount: Number(button.dataset.settleAmount),
      })
    );
  }
}

function renderBalanceStrip(balances) {
  $("balance-strip").innerHTML = balances.balances
    .map((entry) => {
      const tone = entry.net > 0 ? "positive" : entry.net < 0 ? "negative" : "neutral";
      const you = entry.user_id === state.user.id ? " (you)" : "";
      return `
        <div class="balance-chip ${tone}">
          <span class="chip-name">${escapeHtml(entry.name)}${you}</span>
          <span class="chip-value">${money(entry.net)}</span>
        </div>
      `;
    })
    .join("");
}

function renderActivity(expenses, settlements) {
  // Two different record types share one timeline, newest first.
  const items = [
    ...expenses.map((expense) => ({
      kind: "expense",
      date: expense.spent_on,
      id: expense.id,
      data: expense,
    })),
    ...settlements.map((settlement) => ({
      kind: "settlement",
      date: settlement.settled_on,
      id: settlement.id,
      data: settlement,
    })),
  ].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));

  const list = $("activity-list");
  if (!items.length) {
    list.innerHTML = `<li class="empty">Nothing logged yet. Add an expense to start.</li>`;
    return;
  }

  list.innerHTML = items
    .map((item) => {
      if (item.kind === "expense") {
        const expense = item.data;
        const yourShare = expense.shares.find((share) => share.user_id === state.user.id);
        const youPaid = expense.paid_by === state.user.id;
        const detail = youPaid
          ? `You paid · you lent ${money(expense.amount - (yourShare ? yourShare.amount : 0))}`
          : `${escapeHtml(expense.paid_by_name)} paid · your share ${money(
              yourShare ? yourShare.amount : 0
            )}`;
        const breakdown = expense.shares
          .map((share) => `${escapeHtml(share.name)} ${money(share.amount)}`)
          .join(" · ");
        return `
          <li class="activity-item">
            <span class="activity-date">${formatDay(expense.spent_on)}</span>
            <div class="activity-body">
              <p class="activity-title">${escapeHtml(expense.description)}</p>
              <p class="activity-detail">${detail}</p>
              <p class="activity-breakdown">${expense.split_type === "exact" ? "Exact split" : "Even split"} — ${breakdown}</p>
            </div>
            <span class="activity-amount">${money(expense.amount)}</span>
            <button class="icon-button" type="button" title="Delete this expense"
              data-delete-expense="${expense.id}" aria-label="Delete ${escapeHtml(expense.description)}">×</button>
          </li>
        `;
      }

      const settlement = item.data;
      const from = settlement.from_user === state.user.id ? "You" : escapeHtml(settlement.from_user_name);
      const to = settlement.to_user === state.user.id ? "you" : escapeHtml(settlement.to_user_name);
      return `
        <li class="activity-item is-settlement">
          <span class="activity-date">${formatDay(settlement.settled_on)}</span>
          <div class="activity-body">
            <p class="activity-title">${from} paid ${to}</p>
            <p class="activity-detail">${escapeHtml(settlement.note) || "Settled up"}</p>
          </div>
          <span class="activity-amount">${money(settlement.amount)}</span>
          <button class="icon-button" type="button" title="Undo this payment"
            data-delete-settlement="${settlement.id}" aria-label="Undo this payment">×</button>
        </li>
      `;
    })
    .join("");

  for (const button of list.querySelectorAll("[data-delete-expense]")) {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this expense? Balances will be recalculated.")) return;
      try {
        await api(`/api/expenses/${button.dataset.deleteExpense}`, { method: "DELETE" });
        toast("Expense deleted.", "success");
        await refreshGroup();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  for (const button of list.querySelectorAll("[data-delete-settlement]")) {
    button.addEventListener("click", async () => {
      if (!confirm("Undo this recorded payment?")) return;
      try {
        await api(`/api/settlements/${button.dataset.deleteSettlement}`, { method: "DELETE" });
        toast("Payment removed.", "success");
        await refreshGroup();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }
}

function renderMembers(detail) {
  const canRemove = detail.created_by === state.user.id;
  $("member-list").innerHTML = detail.members
    .map((member) => {
      const you = member.id === state.user.id;
      const owner = member.id === detail.created_by;
      const removable = (canRemove && !owner) || (you && !owner);
      return `
        <li>
          <span>
            ${escapeHtml(member.name)}${you ? " (you)" : ""}
            ${owner ? '<span class="pill">organiser</span>' : ""}
          </span>
          ${
            removable
              ? `<button class="icon-button" type="button" data-remove-member="${member.id}"
                   aria-label="Remove ${escapeHtml(member.name)}">×</button>`
              : ""
          }
        </li>
      `;
    })
    .join("");

  for (const button of $("member-list").querySelectorAll("[data-remove-member]")) {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/groups/${detail.id}/members/${button.dataset.removeMember}`, {
          method: "DELETE",
        });
        toast("Member removed.", "success");
        await refreshGroup();
      } catch (error) {
        // The server refuses while that person still owes or is owed anything.
        toast(error.message, "error");
      }
    });
  }
}

$("add-member-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api(`/api/groups/${state.group.detail.id}/members`, {
      method: "POST",
      body: { email: form.get("email") },
    });
    event.target.reset();
    toast("Added to the group.", "success");
    await refreshGroup();
  } catch (error) {
    toast(error.message, "error");
  }
});

$("delete-group").addEventListener("click", async () => {
  const name = state.group.detail.name;
  if (!confirm(`Delete “${name}” and every expense in it? This can't be undone.`)) return;
  try {
    await api(`/api/groups/${state.group.detail.id}`, { method: "DELETE" });
    state.group = null;
    await loadGroups();
    showView("groups");
    toast(`Deleted “${name}”.`, "success");
  } catch (error) {
    toast(error.message, "error");
  }
});

// ---------------------------------------------------------------------------
// Expense form
// ---------------------------------------------------------------------------

function currentSplitType() {
  return document.querySelector('input[name="split_type"]:checked').value;
}

function renderExpenseForm(detail) {
  $("paid-by").innerHTML = detail.members
    .map(
      (member) =>
        `<option value="${member.id}" ${member.id === state.user.id ? "selected" : ""}>
           ${escapeHtml(member.name)}${member.id === state.user.id ? " (you)" : ""}
         </option>`
    )
    .join("");
  renderParticipants();
}

function renderParticipants() {
  const detail = state.group.detail;
  const exact = currentSplitType() === "exact";

  $("participants").innerHTML = detail.members
    .map((member) => {
      const name = `${escapeHtml(member.name)}${member.id === state.user.id ? " (you)" : ""}`;
      if (exact) {
        return `
          <label class="participant exact">
            <span>${name}</span>
            <span class="amount-input small">
              <span aria-hidden="true">$</span>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                     data-exact-share="${member.id}" />
            </span>
          </label>
        `;
      }
      return `
        <label class="participant">
          <input type="checkbox" checked data-participant="${member.id}" />
          <span>${name}</span>
        </label>
      `;
    })
    .join("");

  for (const input of $("participants").querySelectorAll("input")) {
    input.addEventListener("input", updateSplitSummary);
    input.addEventListener("change", updateSplitSummary);
  }
  updateSplitSummary();
}

/** A live preview of the split. The server recomputes all of this on submit. */
function updateSplitSummary() {
  const amountField = $("expense-form").elements.amount;
  const total = Number(amountField.value);
  const summary = $("split-summary");

  if (!total || total <= 0) {
    summary.textContent = "";
    summary.classList.remove("mismatch");
    return;
  }

  if (currentSplitType() === "exact") {
    const entered = [...$("participants").querySelectorAll("[data-exact-share]")].reduce(
      (sum, input) => sum + (Number(input.value) || 0),
      0
    );
    const difference = Number((total - entered).toFixed(2));
    summary.classList.toggle("mismatch", difference !== 0);
    summary.textContent =
      difference === 0
        ? "The shares add up. ✓"
        : difference > 0
        ? `${money(difference)} left to assign.`
        : `${money(-difference)} over the expense total.`;
    return;
  }

  const checked = [...$("participants").querySelectorAll("[data-participant]")].filter(
    (box) => box.checked
  );
  summary.classList.remove("mismatch");
  if (!checked.length) {
    summary.textContent = "Pick at least one person.";
    return;
  }
  // Mirrors the server's rule: leftover cents go to the earliest members.
  const each = Math.floor((total * 100) / checked.length) / 100;
  const leftover = Number((total - each * checked.length).toFixed(2));
  summary.textContent =
    leftover === 0
      ? `${money(each)} each.`
      : `${money(each)} each, with ${money(leftover)} of rounding spread across the first few.`;
}

$("expense-form").addEventListener("input", (event) => {
  if (event.target.name === "amount") updateSplitSummary();
});

for (const radio of document.querySelectorAll('input[name="split_type"]')) {
  radio.addEventListener("change", renderParticipants);
}

$("expense-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const splitType = currentSplitType();

  const body = {
    description: form.get("description"),
    amount: Number(form.get("amount")),
    paid_by: Number(form.get("paid_by")),
    split_type: splitType,
  };

  if (splitType === "exact") {
    body.shares = [...$("participants").querySelectorAll("[data-exact-share]")].map((input) => ({
      user_id: Number(input.dataset.exactShare),
      amount: Number(input.value) || 0,
    }));
  } else {
    body.participants = [...$("participants").querySelectorAll("[data-participant]")]
      .filter((box) => box.checked)
      .map((box) => Number(box.dataset.participant));
  }

  try {
    await api(`/api/groups/${state.group.detail.id}/expenses`, { method: "POST", body });
    event.target.reset();
    toast("Expense added.", "success");
    await refreshGroup();
  } catch (error) {
    toast(error.message, "error");
  }
});

// ---------------------------------------------------------------------------
// Settle-up modal
// ---------------------------------------------------------------------------

function memberOptions(selectedId) {
  return state.group.detail.members
    .map(
      (member) =>
        `<option value="${member.id}" ${member.id === selectedId ? "selected" : ""}>
           ${escapeHtml(member.name)}${member.id === state.user.id ? " (you)" : ""}
         </option>`
    )
    .join("");
}

function openSettleModal(prefill = {}) {
  const members = state.group.detail.members;
  const from = prefill.from ?? state.user.id;
  const to = prefill.to ?? (members.find((m) => m.id !== from) || members[0]).id;

  $("settle-from").innerHTML = memberOptions(from);
  $("settle-to").innerHTML = memberOptions(to);
  $("settle-form").elements.amount.value = prefill.amount ? prefill.amount.toFixed(2) : "";
  $("settle-form").elements.note.value = "";
  $("settle-modal").hidden = false;
  $("settle-form").elements.amount.focus();
}

function closeSettleModal() {
  $("settle-modal").hidden = true;
}

$("settle-button").addEventListener("click", () => openSettleModal());
$("settle-cancel").addEventListener("click", closeSettleModal);
$("settle-modal").addEventListener("click", (event) => {
  if (event.target === $("settle-modal")) closeSettleModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("settle-modal").hidden) closeSettleModal();
});

$("settle-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api(`/api/groups/${state.group.detail.id}/settlements`, {
      method: "POST",
      body: {
        from_user: Number(form.get("from_user")),
        to_user: Number(form.get("to_user")),
        amount: Number(form.get("amount")),
        note: form.get("note") || "",
      },
    });
    closeSettleModal();
    toast("Payment recorded.", "success");
    await refreshGroup();
  } catch (error) {
    toast(error.message, "error");
  }
});

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------

(async function start() {
  if (!getToken()) {
    showView("auth");
    // Nudge the sleeping Render instance now, so signing in isn't the thing
    // that has to wait for it.
    api("/api/health", { auth: false }).catch(() => {});
    return;
  }

  try {
    state.user = await api("/api/auth/me");
    await loadGroups();
    showView("groups");
  } catch {
    // A stale token, or the server is unreachable — either way, show the form.
    showView("auth");
  }
})();
