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

## Session 2: font fix, map/locations, new mechanics (2026-09-28, Claude Code / Claude Opus 5.5)

### Prompt 2 (verbatim)

```
a few things:
- sometimes the price has a weird backwards S symbol, please fix that. unless it's an 8? In that case don't worry about it.
- implement a map feature, so the user can hop on a boat to a new location. the user needs to fish a certain amount of fish in order to activate the map to a new location.
- change the mechanics slightly so it doesn't play exactly like stardew valley..
```

### What the AI did in response

- **Backwards S:** rendered every digit in the game's font to find it. In Pixelify Sans the **2** looks like a backwards S and the **5** looks like an S. It compared six pixel fonts and switched body text and numbers to **Tiny5**, keeping Pixelify Sans for headings.
- **Map:** added four locations in `data.js` (Sunset Dock, then Lily Lagoon, Coral Cove and Aurora Bay, unlocked at 12 / 30 / 55 fish caught). Each has its own sky and water tint, landmark, props and fish, and the new spots are fished from a rowboat. It also added a sea-chart modal with progress bars, a sailing transition, an unlock toast and a glowing Map button, 18 new catches (including crab, jellyfish, axolotl, narwhal and marlin sprites), and location tabs in the Fishdex.
- **Mechanics, so it's less like Stardew:**
  - Aimed casting (tap where to cast) replaced the power bar.
  - The fish shadows became the real fish, sized by rarity, so you cast just ahead of one and landing on it spooks it.
  - The moving-zone reel became a line-tension reel (hold to reel, let go when it thrashes or the line snaps). Rods now have line strength and reel speed.
- **Testing:** a Playwright bot played real rounds, and edge cases were checked (snap, escape, pausing when a menu opens mid-reel, locked travel, old saves migrating, unlocking on catch).

### Changes I made myself

> ✏️ TODO

---

## Session 3: back to the chase, now in 2D (2026-09-28, Claude Code / Claude Opus 5.5)

### Prompt 3 (verbatim)

```
ok the new mechanics are not as fun.. switch it back to the original one where we chase the fish around, but perhaps this time we have a larger screen where have to follow the fish with arrow keys, up down left and right as it is shown moving through the water
```

### What the AI did in response

- Removed the line-tension reel and brought back the "keep the fish in the zone" chase, now as a large 2D underwater panel. The actual fish sprite swims around, and you steer a net with the arrow keys / WASD, by dragging, or with an on-screen D-pad on phones.
- Kept tap-to-aim casting and the fish shadows from session 2, since the prompt was about the reeling.
- Rods went back to upgrading net size and reel speed.
- **Tuning:** the first 2D version was far too hard (a bot lost an uncommon koi in about 2 seconds), because in 2D the fish's jumps outran the net. The fix was to cap fish speed below the net's top speed, start the net and fish closer together, add a short grace period, and slow the drain slightly. After tuning, a bot playing with arrow keys reliably caught common, uncommon and rare fish and sometimes lost the legendary.

### Changes I made myself

> ✏️ TODO

---

## Session 4: aquarium, full day cycle, more islands and fish, LeBron (2026-09-28, Claude Code / Claude Opus 5.5)

### Prompt 4 (verbatim)

```
i also want to implement an aquarium feature, where players can place their fish in an aquarium where they just look at the fish swimming around. they can choose to sell the fish from the aquarium. for the sky, it should rotate between a daytime, like from sunrise to night. add more locations to the map, and also add more fish types to each location. add a lebron fish that is literally just lebron james and not a fish.
```

### What the AI did in response

- **Aquarium:** a new "Tank" menu. Fish swim around a decorated tank (castle, treasure chest, swaying plants, bubbles). Crabs, junk and LeBron walk along the sand instead. Tapping a fish shows a name tag, and you can sell from the tank (with a confirm for rare-or-better fish). Fish get in via a "Tank" button on the catch card or in the bucket. The tank upgrades in the Tackle shop (6 → 12 → 24).
- **Sky:** six phases (sunrise, daytime, golden hour, sunset, dusk, night), with the sun moving left to right across the sky.
- **Map:** three new islands, each with its own landmark and weather:
  - Blossom River: cherry trees, a shrine gate, falling petals
  - Ember Isle: a smoking volcano with a glowing crater, rising embers
  - Cloud Lake: floating islands with waterfalls, drifting mist
- **Fish:** 37 new catches, bringing the total to 72. Every location now has fish at every time of day. New pixel critters include a seahorse, octopus, cloud whale, and recoloured snow and lava crabs.
- **LeBron James:** a pixel LeBron (headband, beard, #23 jersey, basketball) with his own rarity, "The GOAT". He can turn up anywhere at any time, but rarely, and is worth 2,323 coins.

### Changes I made myself

> ✏️ TODO

---

## Session 5: dev mode (2026-09-28, Claude Code / Claude Opus 5.5)

### Prompt 5 (verbatim)

```
make a dev mode where i can select the fish that i want to catch.
```

### What the AI did in response

- Added `dev.js`, a panel that opens with `?dev` or the backtick key. It has a fish picker (grouped by location), instant bites, "Hook it now", "Win reel", +1000 coins, unlock all islands, and jump to any time of day. The picked fish overrides both shadow bites and stray bites.
- "Unlock map" first faked 150 perch catches into the Fishdex. It was changed to a proper `devUnlocked` save flag so the Fishdex stays honest.
- Testing caught a real snag: after ticking the "Instant bites" checkbox, Space toggled the checkbox instead of casting. The panel now drops focus after each change, and Space is ignored while a dropdown is focused.

### Changes I made myself

> ✏️ TODO

---

## Session 6: LeBron can't be sold (2026-09-28, Claude Code / Claude Opus 5.5)

### Prompt 6 (verbatim)

```
the player cannot sell lebron james but they can keep him in the tank forever. also if his weight is 0, then can they ever catch him?
```

### What the AI did in response

- **Can he be caught?** Yes. The `weight: 0` is on the "GOAT" rarity tier, but LeBron's own entry has `weight: 0.35`, which overrides the tier. It works out to about 1 in 200 to 1 in 285 rolls depending on location and time of day. 30,000 real in-game rolls gave 1 in 240. Rod luck doesn't change his odds. A comment in `data.js` now explains the 0.
- **Unsellable:** added `unsellable: true` to LeBron and blocked selling at every point: the catch card (no Sell button), the bucket ("Priceless", and "Sell all" skips him), the tank ("Here forever"), and the game functions themselves, so even a forced sell just keeps him. With the bucket and tank both full, Escape no longer throws him away; you have to choose Release deliberately.

### Changes I made myself

> ✏️ TODO
