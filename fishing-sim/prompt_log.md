# Tiny Tides: prompt log

> ✏️ **TODO (April):** Keep adding to this file as you work. Paste important prompts **verbatim** rather than summarising them, and note which changes you made yourself. The assignment wants roughly 15–40 meaningful prompts across ~8 hours, plus the two required sections below.

## Tools used

- **Claude Code** (VS Code extension), model **Claude Opus 5.5**: built the first playable version (all files in this folder), tested it in a headless browser, and drafted the technical notes in the README.
- ✏️ TODO: add any other tools you use (a chat window for brainstorming, another model for debugging, etc.).

## Which tool for which job

> ✏️ TODO (required): a sentence or two on which model/tool you used for which part of the work, and why.

## One place AI got it wrong

> ✏️ TODO (required): one short paragraph, in your own words, about a time a tool was confidently wrong, proposed something that couldn't work, or introduced a bug it couldn't find, and what you did about it.
>
> A real one from session 1 that you could use or replace: the first version's time-of-day toast read "Golden hour **has fallen**", because the AI templated "X has fallen" for every phase without checking that it made sense for golden hour or sunset. It only caught this after taking screenshots, then moved the messages into `data.js` as per-phase text. Separately, its own automated "corrupt save" test gave a misleading pass: the game's save-on-exit handler overwrote the corrupted data before the reload read it, so the test wasn't testing anything. It had to rewrite the test to call the sanitizer directly.

---

## Session 1: first playable version (2026-09-28, Claude Code / Claude Opus 5.5)

### Prompt 1 (verbatim)

```
here's my next project instructions, please create a new folder called fishing-sim with the required files. i want to create a fishing simulator but like a cute 2.5d game where the user can design their character, collect fish, sell fish, and design their character using the money from selling fish. make it cute and whimsical and warm sunsetty colors, pixellated as well.
```

(followed by the full Project 2 assignment text pasted from the course page)

### What the AI did in response

- Looked at the existing portfolio repo and matched the pattern of earlier projects (a self-contained folder of vanilla HTML/CSS/JS, deployed by GitHub Pages).
- Chose a no-backend, no-build design so there would be no secrets to manage and deployment would just be a push.
- Wrote `data.js`, `sprites.js`, `audio.js`, `game.js`, `ui.js`, `index.html` and `style.css`. That covered procedural pixel art, a four-phase sunset day cycle, the cast/bite/reel state machine, the shop with try-on, bucket selling, the Fishdex, synthesised sound, and localStorage saving.
- Tested with Playwright (headless Chromium) on a desktop viewport and an iPhone 13 viewport: a scripted full playthrough plus edge cases (pressing too early, missing a bite, a full bucket, losing the reel, reload persistence, corrupted saves, keyboard focus). There were no console errors.
- Fixed issues found in the screenshots: the awkward phase toast text, "1 catches", an unreadable capybara sprite, coin icons overlapping numbers, and the prompt covering the canvas on phones.
- Rendered `assets/fishing-sim-preview.png` and replaced the "Next project" placeholder card in the portfolio's Projects section with a Tiny Tides card.

### Changes I made myself

> ✏️ TODO: list your own edits here as you make them (for example, tweaking fish in `data.js`, new cosmetics, rebalanced prices, copy changes, layout fixes). The graders specifically look for these.

---

## Session 2

> ✏️ TODO: continue logging (prompt verbatim → what happened → what you changed).
