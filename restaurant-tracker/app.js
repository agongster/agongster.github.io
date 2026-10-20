/* Restaurant Tracker — a SQLite database that runs in the browser.
 *
 * sql.js is SQLite compiled to WebAssembly, so this page runs the same
 * CREATE TABLE and the same parameterized INSERT/SELECT/UPDATE/DELETE
 * statements as the Python CLI (restaurant_db.py). There is no server: the
 * database lives in memory and is saved to localStorage after every change.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SQL_JS_DIST = "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/";
const STORAGE_KEY = "restaurant-tracker.db";

// Identical to the schema in restaurant_db.py, so .db files move between them.
const SCHEMA = `CREATE TABLE IF NOT EXISTS restaurants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    cuisine     TEXT,
    location    TEXT,
    price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
    rating      REAL    CHECK (rating BETWEEN 1 AND 5),
    UNIQUE (name, location)
)`;
const COLUMNS = ["id", "name", "cuisine", "location", "price_range", "rating"];

// Starter rows so a first-time visitor sees something.
const SAMPLE_ROWS = [
  ["Noodle Bar", "Thai", "Oakland", 2, 4.5],
  ["Pizza Place", "Italian", "Squirrel Hill", 1, 4],
  ["Dumpling House", "Chinese", "Shadyside", 2, 5],
  ["Taco Stand", "Mexican", "Lawrenceville", 1, 3.5],
  ["Sushi Counter", "Japanese", "Downtown", 4, 4.5],
  ["Corner Diner", "American", "Oakland", 1, 3],
];

// ORDER BY can't be a ? placeholder, so the sort is chosen from this fixed list.
const SORTS = {
  name: "name COLLATE NOCASE",
  rating: "rating IS NULL, rating DESC, name COLLATE NOCASE",
  price: "price_range IS NULL, price_range, name COLLATE NOCASE",
  newest: "id DESC",
};

// ---------------------------------------------------------------------------
// Theme toggle (same behaviour as the rest of the portfolio)
// ---------------------------------------------------------------------------

const themeToggle = document.querySelector(".theme-toggle");
function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.textContent = isDark ? "☀ Day mode" : "🌙 Night mode";
}
setTheme(storageGet("theme") || "dark");
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  storageSet("theme", next);
  setTheme(next);
});

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = isError ? "toast error" : "toast";
  el.textContent = message;
  $("toast-stack").append(el);
  setTimeout(() => el.remove(), 3500);
}

/** Turn SQLite's constraint messages into something a person can act on. */
function friendlyError(error) {
  const message = String(error.message || error);
  if (message.includes("UNIQUE")) return "That restaurant is already saved at that location.";
  if (message.includes("NOT NULL")) return "Name is required.";
  if (message.includes("CHECK")) return "Price range must be 1–4 and rating must be 1–5.";
  return message;
}

// localStorage only holds strings, so the database bytes are stored as base64.
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

let SQL;
let db;

function showQuery(sql, params) {
  $("last-sql").textContent = sql.replace(/\s+/g, " ").trim();
  $("last-params").textContent = JSON.stringify(params);
}

/** Run a statement that changes data. Values always go in `params`, never in `sql`. */
function run(sql, params = []) {
  showQuery(sql, params);
  db.run(sql, params);
  save();
}

/** Run a SELECT and return the rows as plain objects. */
function select(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function save() {
  if (!storageSet(STORAGE_KEY, bytesToBase64(db.export()))) {
    toast("Couldn't save to this browser — download the .db file to keep your changes.", true);
  }
}

function sampleDatabase() {
  const fresh = new SQL.Database();
  fresh.run(SCHEMA);
  const stmt = fresh.prepare(
    "INSERT INTO restaurants (name, cuisine, location, price_range, rating) VALUES (?, ?, ?, ?, ?)"
  );
  for (const row of SAMPLE_ROWS) stmt.run(row);
  stmt.free();
  return fresh;
}

/** Make sure a database (e.g. one the visitor uploaded) has the expected table. */
function hasRestaurantsTable(candidate) {
  const result = candidate.exec("PRAGMA table_info(restaurants)");
  if (!result.length) return false;
  const names = result[0].values.map((column) => column[1]);
  return COLUMNS.every((column) => names.includes(column));
}

function loadSavedDatabase() {
  const saved = storageGet(STORAGE_KEY);
  if (!saved) return null;
  try {
    const restored = new SQL.Database(base64ToBytes(saved));
    if (hasRestaurantsTable(restored)) return restored;
    restored.close();
  } catch {
    // Corrupt or unreadable — fall through to the sample data.
  }
  return null;
}

function replaceDatabase(next) {
  if (db) db.close();
  db = next;
  save();
  resetForm();
  render();
}

// ---------------------------------------------------------------------------
// Read: list, filters, stats
// ---------------------------------------------------------------------------

const rowsEl = $("rows");
const searchEl = $("search");
const cuisineFilterEl = $("cuisine-filter");
const sortEl = $("sort");

function formatPrice(price) {
  return price ? "$".repeat(price) : "—";
}
function formatRating(rating) {
  if (rating === null || rating === undefined) return "—";
  const shown = Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1);
  return `<span class="rating-star" aria-hidden="true">★</span> ${shown}`;
}

function renderCuisineOptions() {
  const cuisines = select(
    "SELECT DISTINCT cuisine FROM restaurants WHERE cuisine IS NOT NULL ORDER BY cuisine COLLATE NOCASE"
  ).map((row) => row.cuisine);

  const current = cuisineFilterEl.value;
  cuisineFilterEl.innerHTML =
    '<option value="">All cuisines</option>' +
    cuisines.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  cuisineFilterEl.value = cuisines.includes(current) ? current : "";

  $("cuisine-options").innerHTML = cuisines
    .map((c) => `<option value="${escapeHtml(c)}"></option>`)
    .join("");
}

function renderStats() {
  const [{ total, average }] = select(
    "SELECT COUNT(*) AS total, AVG(rating) AS average FROM restaurants"
  );
  const avg = average === null ? "" : ` · average rating ${average.toFixed(1)}`;
  $("stats").textContent = `${total} restaurant${total === 1 ? "" : "s"}${avg}`;
}

/** `logQuery: false` keeps the "Last query" panel on the write that just ran. */
function renderRows({ logQuery = true } = {}) {
  const where = [];
  const params = [];
  const term = searchEl.value.trim();
  if (term) {
    where.push("name LIKE ?");
    params.push(`%${term}%`);
  }
  if (cuisineFilterEl.value) {
    where.push("cuisine = ?");
    params.push(cuisineFilterEl.value);
  }
  const sql =
    "SELECT * FROM restaurants" +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY ${SORTS[sortEl.value] || SORTS.name}`;

  const rows = select(sql, params);
  if (logQuery) showQuery(sql, params);

  const editingId = Number(form.elements.id.value) || null;
  rowsEl.innerHTML = rows
    .map(
      (r) => `
      <tr class="${r.id === editingId ? "is-editing" : ""}">
        <td class="name">${escapeHtml(r.name)}</td>
        <td class="muted">${escapeHtml(r.cuisine) || "—"}</td>
        <td class="muted">${escapeHtml(r.location) || "—"}</td>
        <td class="price">${formatPrice(r.price_range)}</td>
        <td class="rating">${formatRating(r.rating)}</td>
        <td class="actions">
          <button type="button" class="ghost-button tiny" data-edit="${r.id}"
            aria-label="Edit ${escapeHtml(r.name)}">Edit</button>
          <button type="button" class="ghost-button tiny danger" data-delete="${r.id}"
            aria-label="Delete ${escapeHtml(r.name)}">Delete</button>
        </td>
      </tr>`
    )
    .join("");
  $("empty").hidden = rows.length > 0;
}

function render(options) {
  renderCuisineOptions();
  renderStats();
  renderRows(options);
}

searchEl.addEventListener("input", () => renderRows());
cuisineFilterEl.addEventListener("change", () => renderRows());
sortEl.addEventListener("change", () => renderRows());

// ---------------------------------------------------------------------------
// Create + Update: the form
// ---------------------------------------------------------------------------

const form = $("restaurant-form");
const formError = $("form-error");

/** Read the form into column values, or return an error message. */
function readForm() {
  const text = (name) => form.elements[name].value.trim() || null;
  const name = text("name");
  if (!name) return { error: "Name is required.", field: "name" };

  const price = form.elements.price_range.value;
  const ratingText = form.elements.rating.value.trim();
  const rating = ratingText === "" ? null : Number(ratingText);
  if (rating !== null && !(rating >= 1 && rating <= 5)) {
    return { error: "Rating must be a number from 1 to 5.", field: "rating" };
  }

  return {
    values: {
      name,
      cuisine: text("cuisine"),
      location: text("location"),
      price_range: price ? Number(price) : null,
      rating,
    },
  };
}

function resetForm() {
  form.reset();
  form.elements.id.value = "";
  $("form-title").textContent = "Add a restaurant";
  $("submit-button").innerHTML = 'Add restaurant <span aria-hidden="true">&rarr;</span>';
  $("cancel-edit").hidden = true;
  formError.textContent = "";
  for (const el of form.elements) el.removeAttribute("aria-invalid");
}

function startEdit(id) {
  const [row] = select("SELECT * FROM restaurants WHERE id = ?", [id]);
  if (!row) return;
  resetForm();
  form.elements.id.value = row.id;
  form.elements.name.value = row.name;
  form.elements.cuisine.value = row.cuisine ?? "";
  form.elements.location.value = row.location ?? "";
  form.elements.price_range.value = row.price_range ?? "";
  form.elements.rating.value = row.rating ?? "";
  $("form-title").textContent = `Edit ${row.name}`;
  $("submit-button").innerHTML = 'Save changes <span aria-hidden="true">&rarr;</span>';
  $("cancel-edit").hidden = false;
  renderRows();
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.elements.name.focus({ preventScroll: true });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  for (const el of form.elements) el.removeAttribute("aria-invalid");

  const { values, error, field } = readForm();
  if (error) {
    formError.textContent = error;
    form.elements[field].setAttribute("aria-invalid", "true");
    form.elements[field].focus();
    return;
  }

  const id = Number(form.elements.id.value) || null;
  const params = [values.name, values.cuisine, values.location, values.price_range, values.rating];
  try {
    if (id) {
      run(
        "UPDATE restaurants SET name = ?, cuisine = ?, location = ?, price_range = ?, rating = ? WHERE id = ?",
        [...params, id]
      );
      toast(`Updated ${values.name}.`);
    } else {
      run(
        "INSERT INTO restaurants (name, cuisine, location, price_range, rating) VALUES (?, ?, ?, ?, ?)",
        params
      );
      toast(`Added ${values.name}.`);
    }
  } catch (err) {
    formError.textContent = friendlyError(err);
    return;
  }

  resetForm();
  render({ logQuery: false });
});

$("cancel-edit").addEventListener("click", () => {
  resetForm();
  renderRows();
});

// ---------------------------------------------------------------------------
// Update + Delete: row buttons
// ---------------------------------------------------------------------------

rowsEl.addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  if (editId) return startEdit(Number(editId));

  const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
  if (!deleteId) return;
  const [row] = select("SELECT name FROM restaurants WHERE id = ?", [Number(deleteId)]);
  if (!row || !confirm(`Delete ${row.name}?`)) return;

  run("DELETE FROM restaurants WHERE id = ?", [Number(deleteId)]);
  if (Number(form.elements.id.value) === Number(deleteId)) resetForm();
  render({ logQuery: false });
  toast(`Deleted ${row.name}.`);
});

// ---------------------------------------------------------------------------
// Database file: open, download, reset
// ---------------------------------------------------------------------------

$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  let imported;
  try {
    imported = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
    if (!hasRestaurantsTable(imported)) {
      imported.close();
      toast("That file doesn't have a restaurants table with the expected columns.", true);
      return;
    }
  } catch {
    toast("That file isn't a SQLite database.", true);
    return;
  }
  replaceDatabase(imported);
  toast(`Opened ${file.name}.`);
});

$("export-button").addEventListener("click", () => {
  const blob = new Blob([db.export()], { type: "application/x-sqlite3" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "restaurant.db";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

$("reset-button").addEventListener("click", () => {
  if (!confirm("Replace everything with the sample restaurants? Your changes will be lost.")) return;
  replaceDatabase(sampleDatabase());
  toast("Reset to the sample data.");
});

// ---------------------------------------------------------------------------
// Start up
// ---------------------------------------------------------------------------

async function start() {
  try {
    SQL = await initSqlJs({ locateFile: (file) => SQL_JS_DIST + file });
  } catch {
    $("loading").textContent = "Couldn't load SQLite. Check your connection and refresh the page.";
    return;
  }
  db = loadSavedDatabase() || sampleDatabase();
  db.run(SCHEMA);
  save();
  $("loading").hidden = true;
  $("app").hidden = false;
  render();
}

start();
