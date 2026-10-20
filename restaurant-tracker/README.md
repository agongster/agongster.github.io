# Restaurant Tracker — frontend

A log of restaurants I've been to: name, cuisine, location, price range (1–4)
and rating (1–5). You can add, search, filter, sort, edit and delete entries.

Open it at [restaurant-tracker/index.html](index.html), linked from the
[Projects](../index.html#projects) section of my portfolio.

## How it works

GitHub Pages only serves static files, so there's no server here to run Python
or keep a database file. Instead the page loads
[sql.js](https://sql.js.org/), which is SQLite compiled to WebAssembly, from the
jsDelivr CDN. That means the page runs a real SQLite database in the browser:

- **Same schema as the Python CLI.** The `CREATE TABLE` in `app.js` matches
  `restaurant_db.py`, including the `CHECK` constraints on price range and
  rating and the `UNIQUE (name, location)` constraint.
- **Parameterized queries everywhere.** Every value goes through a `?`
  placeholder, including search terms. `ORDER BY` can't be a placeholder, so the
  sort is picked from a fixed list in `SORTS`. The **Last query** panel shows the
  SQL that ran and its parameters.
- **Saved in your browser.** After every change, the database is exported and
  stored in `localStorage` as base64, so each visitor has their own copy. A
  first-time visitor gets six sample restaurants.
- **Works with the Python app.** **Open .db file** loads a `restaurant.db` made by
  `restaurant_db.py` (after checking it has a `restaurants` table with the
  expected columns). **Download .db** saves the current database as a file the
  Python app can open.
- Constraint errors from SQLite (duplicate restaurant, out-of-range values) are
  turned into plain messages next to the form.

## Files

- `index.html`: the add/edit form, the database file controls, the restaurant
  table and the last-query panel.
- `style.css`: page-specific styling on top of the portfolio's theme tokens in
  `../styles.css`.
- `app.js`: loading sql.js, the schema and sample data, saving to
  `localStorage`, and create/read/update/delete.

## Running it locally

sql.js loads a `.wasm` file, which browsers won't do from `file://`, so serve
the folder:

```bash
# from the root of this repository
python3 -m http.server 5500
```

Then open <http://127.0.0.1:5500/restaurant-tracker/index.html>.

## AI assistance

Built with Claude Code. The prompts and responses are in the restaurant-db
project's `prompt_log.md`.
