# Tally — frontend

A shared-expense tracker: create a group, log what people paid for, split it
evenly or by exact amounts, and see who owes whom — then record a payment once
the money actually moves.

Open it at [tally/index.html](index.html), linked from the
[Projects](../index.html#projects) section of my portfolio.

This folder is the **frontend only**. The API it talks to lives in a separate
repository: **[agongster/tally-backend](https://github.com/agongster/tally-backend)**,
deployed at `https://tally-backend-lusl.onrender.com` with a Neon Postgres database
behind it. That repo's README documents every endpoint.

## How it works

- Plain HTML, CSS and JavaScript — no build step and no framework, like the rest
  of this site. It inherits colors, fonts and the dark/light toggle from
  `../styles.css`, with `style.css` holding only what's specific to this page.
- Three views live in one page (`#view-auth`, `#view-groups`, `#view-group`),
  swapped by toggling the `hidden` attribute. Because several rules here set
  `display`, `style.css` starts with an explicit `[hidden] { display: none !important; }` —
  otherwise a `display` rule silently overrides the browser's default and the
  "hidden" views stay on screen.
- **It holds no secrets and does no authoritative maths.** Every amount shown
  was computed by the server. The live split preview under the expense form is a
  convenience; the server recomputes the split and rejects anything that doesn't
  add up.
- Signing in stores a JWT in `localStorage` and sends it as
  `Authorization: Bearer <token>` on every later request. A `401` clears the
  token and returns to the sign-in form.
- Opening a group fetches its detail, balances, expenses and settlements with
  one `Promise.all` rather than four sequential requests — on a cold free-tier
  server the difference is very noticeable.
- Render's free tier sleeps when idle, so the first request after a quiet spell
  can take up to a minute. The page pings `/api/health` on load to start the
  wake-up early, and shows a "waking up" banner only if a request is actually
  slow.
- Running from `localhost` automatically points at `http://127.0.0.1:8000`
  instead of the deployed API, so local development doesn't touch the live
  database.

## Files

- `index.html` — the three views, the add-expense form, and the settle-up modal.
- `style.css` — page-specific styling on top of the portfolio's theme tokens.
- `app.js` — the whole client: the fetch wrapper and error handling, auth and
  token storage, rendering for each view, the split preview, and the settle-up
  flow.

## Running it against a local backend

```bash
# from the root of this repository
python3 -m http.server 5500
```

Then start the backend (see its README) and open
<http://127.0.0.1:5500/tally/index.html>.

## AI assistance

Built with Claude Code (Claude Opus 5). The development log, including the
prompts and the design decisions, is in the backend repo:
[prompt_log.md](https://github.com/agongster/tally-backend/blob/main/prompt_log.md).
