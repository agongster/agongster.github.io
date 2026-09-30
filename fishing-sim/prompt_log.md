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

---

## Session 7: mystery shadow while reeling (2026-09-29, Claude Code / Claude Opus 5.5)

### Prompt 7 (verbatim)

```
the player should not be able to see the fish when they are catching it, keep it like a generic shadow figure while catching the fish
```

### What the AI did in response

- **Mystery shadow:** the chase panel now draws a generic dark fish shadow instead of the fish's sprite. It deliberately doesn't use the fish's own silhouette, which would still give some away (especially LeBron). Its size scales with rarity to match the shadows in the water. The real fish is revealed when it arcs onto the dock.
- **Dead code:** removed the leftover `miniFish` helper from the tension-reel era.
- **Dev bug found while testing:** "Win reel" set the catch bar to exactly 100%, but the game drains the bar before checking for a catch. So it only worked when the fish happened to be inside the net. The AI's first theory was that the test script was flaky; state logging showed the real cause. The button now triggers the catch directly.

### Changes I made myself

> ✏️ TODO

---

## Session 8: boat customization (2026-09-29, Claude Code / Claude Opus 5.5)

### Prompt 8 (verbatim)

```
the user should also be able to customize their boat in the shop
```

### What the AI did in response

- **Boat tab:** added a Boat tab to the shop with five parts, defined in `BOAT_PARTS` in `data.js`:
  - Hull colour (up to a 1,500-coin solid gold hull with a moving glint)
  - Stripe colour
  - Sail design (stripes, heart, star, fish, rainbow)
  - Flag (pennant, heart, pirate, fish)
  - Decor (potted fern, flower box, rubber duck, string lights that glow at night)
- **Try before you buy:** same as the wardrobe, with a live preview of your angler in the boat with the sail up.
- **Where the boat shows:** tied up at the home dock, at every boat location, while sailing (with your chosen sail), and as the marker on the sea chart. Old saves get the default boat, and invalid parts are reset.
- **Thumbnails:** the first version showed the whole boat at thumbnail size, so small decorations were unreadable. Each thumbnail now zooms in on the part that item changes.
- **Phone bug found while testing:** on phones the dev panel sat on top of menus and covered the "Start fishing!" button. It now sits underneath menus.

### Changes I made myself

> ✏️ TODO

---

## Session 9: silly boat styles (2026-09-29, Claude Code / Claude Opus 5.5)

### Prompt 9 (verbatim)

```
i want the boat base to have more unique options, like a duck parade boat or a swan, or other random silly options
```

### What the AI did in response

- **Styles:** added a "Style" part to the boat with nine options: rowboat, cardboard box (soggy at the bottom), banana, watermelon slice, clawfoot bathtub (bubbles and a dripping faucet), teacup on a saucer (steam included), giant sneaker, swan boat, and duck parade (a big rubber duck with three ducklings bobbing behind).
- **How they're drawn:** each style has a back half (behind the angler) and a front half (in front), all built around the same rim line, so sails, flags and decorations work on every one.
- **Colours:** hull and stripe colours paint the rowboat, bathtub, teacup and sneaker. For the other styles the shop explains that the style has its own colours. The rubber-duck decoration moves over on the swan and duck boats so it doesn't sit on their heads.

### Changes I made myself

> ✏️ TODO

---

## Session 10: multiplayer plan, backend steps 1 and 2 (2026-09-29, Claude Code / Claude Opus 5.5)

### Prompts (verbatim)

```
i now want to make this game multiplayer, where people can friend other users based on unique usernames, and they can visit each other's worlds and gift each other coins, and fish together in the same world. please outline a step by step plan for implementing this, and instruct me on what i would need to do to set this up. most likely i would use render for anything requiring a backend, neon for a database.
```

```
Your service has not been deployed because the GitHub repository is empty. Make a commit before retrying.
```

```
service url: https://tiny-tides-backend.onrender.com
```

### What happened

- **Plan:** a 6-step plan: deploy, accounts and cloud saves, friends, visiting, gifting, and real-time co-op fishing as the stretch goal and cut line. I set up Neon, the GitHub repo and the Render service myself.
- **Step 1:** the AI wrote a minimal FastAPI backend (`/api/health`, Neon URL handling, CORS that ignores a trailing slash) and pushed it to the empty repo. Verified live: database connected, CORS allowed from GitHub Pages.
- **Step 2, backend:**
  - Sign up with email, a case-insensitively unique username and a password (bcrypt), then log in by email or username with a JWT.
  - A versioned cloud save: a stale write gets a 409 instead of overwriting.
  - 7 pytest tests.
- **Step 2, game:** `online.js` with an account menu, auto-upload, a cloud status pill, a "which save?" choice when two devices diverge, and dev mode locked while logged in. Tested with two browser profiles against a local backend.
- **Where the AI got it wrong:**
  - It pinned `psycopg[binary]==3.2.3` (copied from Tally), which had no package for this Mac's Python 3.9. Its first local test "passed" only because the install had silently failed and the output was cut off; the server never started. It then switched to Python 3.11 (what Render runs) and bumped psycopg.
  - The first version of the login form wiped everything you'd typed whenever it showed an error, so the second attempt sent empty fields. The two-device test caught it.

### Changes I made myself

> ✏️ TODO

---

## Session 11: all multiplayer features (2026-09-29, Claude Code / Claude Opus 5.5)

### Prompts (verbatim)

```
of the multiplayer features what is currently implemented?
```

```
implement all multiplayer features now
```

### What the AI did in response

- **Backend** ([tiny-tides-backend](https://github.com/agongster/tiny-tides-backend), 17 tests):
  - **Friends:** friend requests by username (asking back accepts), accept, decline, unfriend, and a friends list with who's online and where.
  - **Worlds:** a friends-only world snapshot for visiting, with no coins or bucket exposed.
  - **Gifts:** coins move with one conditional database update, so nobody can overspend. The limits are 1–1000 per gift and 2000 a day. Gifts wait in a mailbox, and every server-side coin change bumps the save version so a stale game can't undo it.
  - **Coin check:** saves that gain impossibly many coins at once are refused.
  - **Live rooms:** WebSocket rooms (host plus 3 visitors) that relay casts, catches, emotes and the host's world, and push alerts for friend requests and gifts.
- **Game:**
  - `net.js`: live rooms, visiting (with a sailing transition), following the host when they sail, drawing other anglers with name tags, lines, bobbers and catches, a napping host when offline, and Wave/Heart emotes.
  - `online.js`: Friends, Gifts and Account tabs, and the gift form.
  - A read-only view of a friend's tank.
- **Testing:** two browser profiles against a local backend ran the whole loop: befriend, visit, see each other fish, follow the host, gift, host leaves (napping), go home. A phone-sized check covered the layout too.
- **Where the AI got it wrong:** its first version put the login token in the WebSocket URL (`?token=...`). The server log from the test run showed full tokens printed on every connection, which on Render would let anyone who reads the logs act as that player. The token now goes in the first message after connecting, and a test checks that missing or forged tokens are rejected.

### Changes I made myself

> ✏️ TODO

## Session 12: going live, login up front, and rarity-based difficulty (2026-09-30, Claude Code / Claude Opus 5.5)

### Prompts (verbatim)

```
i see the commit pushed to github but it's not updating on render
```

```
this is the error i get when i try to sign up with an account. also, Render On Commit is turned on for Auto-Deploy, the branch is set to main. I cannot find the Github settings place to change allowed repos in Render.
```
(with a screenshot of the sign-up form showing "Couldn't reach the server. Check your connection and try again.")

```
a few things: make the login more noticeable, as by default the user should try to sign up or log in with an account. also, make it so that the rarer the fish is, the harder it is to catch, and the more upgraded the rod is, the more significantly easier it is to catch fish. right now the difference is not very noticeable.
```

```
have a profile button that links to the shop as well
```

```
sure, commit and push those. after that take a look at this screenshot. i have 61 coins but i'm unable to buy the 30 coin tackle. is this supposed to happen?
```
(with a screenshot of the Tackle tab, where the Bamboo Rod's price looked like 30)

```
can you make the font easier to read?
```

```
the friend username is overlapping when i try to fish. also, there should be an indicator of whether the friend is online.
```
(with a screenshot of the chase panel with "@melonliz (napping)" floating over the water)

```
this popup pops up A LOT. like every time i leave the tab and sometimes when i'm playing the game. by default, if the user is logged in, it should always just save the online account version, and should not ask the user.
```
(with a screenshot of the "Which save?" chooser, showing two identical saves)

### What the AI did in response

- **Render:** by the second message the new version had deployed on its own. The AI confirmed every route was live and a real sign-up worked from the terminal (this left a test account, `deploycheck`, in the database). The sign-up error came from opening the game as a local file: the server only accepts the GitHub Pages site and `localhost`.
- **Login up front:** when logged out, the title screen leads with a "Play online" card with big Sign up / Log in buttons. "Play offline" and "Keep fishing offline" become smaller buttons under an "or play on this device only" line. After you log in from the title, it goes straight back to the title. In the game, the HUD button reads "Log in / Sign up" and gently pulses (no pulse if the device asks for reduced motion).
- **Profile:** the account window's Account tab became **Profile**. It shows your angler, name, username, catches, coins and Fishdex, plus "Change your look" and "Customize your boat" buttons that open the Shop on the right tab. There's a Profile button in the HUD and on the title screen when you're logged in.
- **Difficulty:**
  - Each rarity now has reel modifiers: rarer fish swim faster, fill the catch bar slower, and drain it faster when they slip out.
  - Rods got two new stats, **tame** (slows the fish) and **grip** (less drain), and much bigger gaps: net 14 → 16 → 21 → 26 and reel speed 30 → 34 → 45 → 56. The Shop lists the new stats.
  - The AI tuned the numbers with a simulated player who steers at the fish with a short reaction delay. With the Twig rod, a rare fish went from about 26% to about 1% for that bot. With the Star rod, a legendary went from 87% to 100%. The bot is worse than a real player, so it's only a guide to how far apart the rods are.
- **"30 coin" rod:** the Bamboo Rod actually costs 90. In the Tiny5 font, 3 and 9 differ by only a couple of pixels, and the greyed-out button made it worse. Digits now come from a 1 KB digits-only subset of Jersey 10 (self-hosted in `fonts/`, SIL Open Font License), scaled to match Tiny5. Buy buttons you can't afford yet also say how many more coins you need.
- **Easier-to-read font:** the AI compared Tiny5, Pixelify Sans, VT323, Jersey 10 and Fredoka on real game text, then moved all body text to Jersey 10. It keeps the pixel look but has normal letter shapes, and it was already the digit font. It's self-hosted (5 KB) so it can be scaled up to fill the space the old font did. Headings stay Pixelify Sans but borrow Jersey's digits, since Pixelify's 5 looks like a backwards S. Tiny5 is no longer loaded.
- **Name tags over the reel:** name tags are HTML on top of the canvas, so they now hide while the chase panel is open.
- **Online indicators:** friends show a green "Online" or grey "Offline" label, and online friends are listed first. The Friends button shows how many are online (for example "1 on"), refreshed every 30 seconds and right away when the friend you're visiting arrives or leaves. The visiting bar has an Online / "Offline, napping" label, and name tags have a green or grey light.
- **"Which save?" popup:** this was a bug, not a real conflict. When you switched tabs, the game uploaded your save without reading the server's reply, so it kept an old version number. The next autosave looked out of date and was refused, and the game assumed another device had saved. Switching tabs now does a normal save that records the new version, and the last-chance save when closing the page records it too if the page survives. The chooser is gone: logged in, the online save always wins, including when you log in on a device with its own offline progress. A two-browser test against a local backend (tab switches, page closes, a second device logging in, visiting, the host leaving) got zero refused saves.

### Changes I made myself

> ✏️ TODO
