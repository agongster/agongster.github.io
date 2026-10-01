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

```
i am testing multiplayer with my friend and it doesn't seem to be syncing correctly. when she visits my world it shows as me napping, even though i'm active in my world, and i can't see her at all.
```

```
it works now, no need to deploy anything new. remove the "keep" function, we will only have a tank and not a bucket.
```

```
i also want to make improvements to the tank, so the user should be able to customize it. as in, they can buy props for the tank and move them around to place.
```

```
currently in the multiplayer, users cannot go to other places in their friend's map. make it so that they can.
```

```
commit and push these changes/
```

```
make it so that the user can occassionally catch enchantments that boost their luck and net temporarily. they can use these at will after catching. ALSO add 100 more types of new fish, and make fishing slightly easier for the low price rods and slightly harder for the higher price rods (in general), the luck metrics should still be the same for these though
```

```
yes
```

```
add a chat room to the multiplayer version of the game. make the star rod 10000 coins.
```

```
make the fish do slightly more movements, so the user has to move the net around a bit more to catch the fish
```

```
are the user passwords all encrypted and secure?
```

```
do not slow the fish when upgrading the tackle
```

```
i think improve grip and speed that you can move the net range at. also, please make it so the buddies are visible in the boats. and add a lot of new buddy options with higher prices. generally, make much more expensive options for everything available.
```

```
yes, push everything.
```

```
i don't see the chat rooms?
```

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
- **Host shown napping, players can't see each other:** the AI probed the live server with scripted connections.
  - **Where the AI got it wrong:** it first blamed Render for running several copies of the server. It added a worker count and process id to `/api/health` to check, and later a random per-instance id. That theory was wrong: the "offline 24/24" result that suggested it was a flaw in its own test (the test account had no save, so "offline" was really an error). A real two-browser visit on the live site then worked fine.
  - **The real cause:** reconnecting. When a player's connection is replaced (a Wi-Fi blip, a laptop waking up, a server restart, a second tab), the old connection's cleanup told the room the player had left, so visitors showed the host napping. On Render, the "you've been replaced" close signal also never reached the old connection, leaving a tab that thinks it's connected but isn't. And the new connection waited about 10 seconds for the old one to close.
  - **Fix (server):** a replaced connection no longer announces "leave" or a second "join". The old one gets an explicit `replaced` message, and closing it happens in the background.
  - **Fix (game):** a tab that's been replaced stops syncing and says so, rather than fighting the other tab. It ignores messages from old connections. It pings the server and reconnects if a ping gets no answer, which still works in background tabs where browsers slow down timers.
  - **Tests:** a new server test covers reconnecting. Local browser tests covered a 4-second network drop, a second tab, and a frozen server (the game reconnected by itself).
- **No more bucket:** a catch now goes in the **Tank**, gets sold, or gets released. The bucket, its HUD pill, its window, its shop upgrades and the bucket prop on the dock are gone. The HUD shows the tank count instead, and the Tank window has a **Sell all** button (with a confirm).
  - Leaving the catch card any other way (Escape, or sailing off) puts the fish in the tank if there's room, or else sells it.
  - LeBron can't be sold, so he always fits, even in a full tank.
  - **Old saves:** bucket fish move into the tank, even past its size (you just can't add more until you sell), and bucket upgrades are refunded (110 or 510 coins). A browser test checked this, including that reloading doesn't refund twice.
- **Tank props:** a new **Tank** tab in the Shop sells 16 props, each drawn in pixel art in code. Three are free starters: the sandcastle, treasure chest and kelp, which every tank already had. The rest range from a 25-coin starfish to a 400-coin GOAT trophy, and some animate: the clam opens, the volcano erupts bubbles, the jellyfish glows. You can buy a prop more than once.
  - **Decorate:** in the Tank, press **Decorate** to drag props with a mouse or finger. Tap one to flip it or put it away, and arrow keys nudge the selected one. Floor props stay on the sand (lower looks nearer), while floating ones (the duck, the jellyfish) go anywhere in the water. Put-away props wait in a tray, and up to 30 can be in the tank at once.
  - **Saving and sharing:** the layout saves with everything else, and friends see it when they open "Their tank". That needed a one-word server change (`decor` added to the fields a visitor can see). Older saves get the starter layout, which matches the old fixed decorations.
  - **Where the AI got it wrong:** the Shop's new help text reused the `tank-hint` class, and the Tank updated whichever `.tank-hint` came first on the page. That was the Shop's, so the Tank's hints (including "Over capacity!") silently stopped changing. A screenshot caught it; the Tank now targets its own hint.
- **Exploring a friend's map:** visitors could only follow the host. Now:
  - **Sailing:** the Map, while visiting, shows the host's unlocked spots ("@host's sea"). You can sail to any of them, even spots you haven't unlocked yourself. Spots the host hasn't found say so, and a gold flag and an "@host is here" tag mark the host.
  - **Who you see:** each player now sends which spot they're at with their live updates, and you only see anglers at your spot. The host's bar says "@friend is exploring your world" when a visitor is elsewhere.
  - **Following:** you follow the host only if you were at the same spot when they sailed. Otherwise the bar shows where they are, with a **Join them** button. The host's world updates also carry their unlocked spots, so a spot they unlock mid-visit opens up for visitors.
  - **Tests:** a two-browser test against a local backend ran through together, guest sails off alone, host moves (guest stays), guest joins, host moves (guest follows). No server change was needed.
- **Enchantments:** about 1 catch in 16 also brings up a charm, shown on the catch card. There are four kinds: Clover Charm (luck +10, 1:30), Wide Net Rune (net +5, 1:30), Tide Pearl (luck +25, 1:00, rarer) and Starlight Elixir (both, 2:00, rarest).
  - **Using them:** a **Charms** button appears once you have one. Use a charm whenever you like; using one that's already working adds time (up to 10 minutes).
  - **While one works:** a shimmering pill in the top bar shows the boost and a countdown. The countdown only runs while you're out fishing, not in menus, and it survives a reload.
  - **Effect:** luck and net boosts feed the same places the rod's do: which fish bite, how big they are, and the chase net's size. The dev panel got a "+1 of each charm" button.
- **100 more fish (172 total):** 15 each for Sunset Dock and Lily Lagoon and 14 for each other spot, themed to the place: Marshmallow Shiner, Boba Puffer, Hermit Crab, Walrus Wrasse, Kitsune Eel, Lava Lamp Guppy, Hot Air Puffer, Celestial Carp, and more.
  - Each spot got about 6 common, 4 uncommon, 3 rare and 1–2 legendary, with prices and difficulty in the existing ranges.
  - They're drawn by the same code as before (body shapes, patterns, colours). A few reuse the crab, jelly, seahorse, axolotl and narwhal pixel art in new colours.
  - A check confirmed no duplicate ids or names, and that every spot still has common fish at every time of day. All 172 sprites render.
- **Rods rebalanced:** Twig and Bamboo got a bigger net, faster reel, and more fish-slowing and grip. Sunset and Star got a little less of each. Luck is unchanged. With the simulated player, Twig on uncommons went from 31% to 91% and Bamboo on rares from 7% to 54%, while Sunset on legendaries went from 27% to 9% and Star on LeBron from 95% to 20%. Better rods are still clearly better.
- **Chat:** each world (your own or a friend's) is a chat room.
  - **Server:** a new `chat` message type. The server trims each message to one line of up to 150 characters, allows 5 per 10 seconds per player (anything faster gets a "slow down" reply), keeps the last 30 messages of each room, and sends them to anyone who joins. A new server test covers all of this.
  - **Game:** a **Chat** button in the multiplayer bar shows an unread count and opens a small panel with the log and a text box. Enter sends and Escape leaves the box; typing never casts the line. On bigger screens, messages pop up over the sender's head for a few seconds. On phones the anglers stand too close for that, so the name tag lights up with "..." instead.
  - **Safety:** messages are built with `textContent`, never HTML, because they're whatever people typed. A test sent `<img src=x onerror=...>` and it showed as plain text.
- **Star Rod** now costs 10,000 coins (was 1,000).
- **Livelier fish in the chase:**
  - **Movement:** the fish picks a new spot about 30% more often, and every ordinary move goes at least 32px, so it no longer sits still (a common fish used to hold still about 8–13% of the time; now about 2%). It swims 12–20% further per second, darts slightly more, and has a small side-to-side swish. Its top speed is a touch lower, so the net can always keep up.
  - **Balance:** that alone made fishing clearly harder (Bamboo on rare fish fell from about 57% to 20% in the simulation), so the catch bar now drains 15% more slowly when the fish slips out. Overall catch rates end up close to before (e.g. Twig on uncommons 89% vs 93%, Star on legendaries 93% vs 81%), but every fight has more chasing and takes a few seconds longer.
  - **Where the AI got it wrong:** its first "before" measurement was invalid. The simulator keeps its own copy of the movement code, so stashing the game file changed nothing and both runs used the new movement. It rebuilt the old version in the simulator to get a real baseline.
- **Password check (question only):** the AI read the server code and confirmed passwords are hashed with bcrypt (salted, cost 12) and never stored, logged or returned. It flagged three small gaps it could fix: no limit on login attempts, bcrypt ignoring anything past 72 characters, and a timing hint that reveals which emails have accounts.
- **Rods no longer slow fish:** the "tame" stat and its "Fish slowed" label are gone, and two rod descriptions that promised it were reworded. The simulation showed this made better rods much weaker (Star on legendaries fell from 93% to 29%), which led to the next change.
- **Grip and net speed:** every rod has better grip and a new **net speed** stat: how fast the net moves and how quickly it gets going (150 to 210 across the four rods, up from a flat 150). Two new top rods: **Aurora Rod** (40,000) and **GOAT Rod** (150,000), each with a sparkle at the tip. In the simulation, Star on legendaries is back to 91%, Bamboo on rare fish is 23%, and the new rods catch nearly anything.
- **Buddies in boats:** buddies were drawn behind the hull, so only their ears showed. In a boat they now sit up on the side, drawn after the hull, and are visible in all nine styles (checked with screenshots).
- **Twelve new buddies,** each drawn as pixel art with a blink: Bunny (1,000), Penguin, Fox, Panda, Axolotl, Corgi, Otter (with a clam), Red panda, Friendly ghost, Baby dragon, Unicorn (25,000) and Golden duck (50,000).
- **Expensive options everywhere:**
  - **Hats:** party, chef, pirate, wizard, top hat, halo, and a diamond crown (30,000).
  - **Tops:** kimono, tuxedo, gold jacket, and a royal robe (20,000).
  - **Hair:** big curls, mohawk, side ponytail. **Faces:** moustache, monocle, star shades, diamond shades (15,000).
  - **Boats:** two new styles, a Yacht in your colours (12,000) and a gold Royal barge with a crown figurehead (40,000). Also obsidian, rose gold and diamond hulls (to 25,000); platinum, ruby and emerald stripes; rainbow and golden sails and a royal crest; crown, rainbow and GOAT flags; animated fireworks and a treasure hoard on deck.
  - **Tank:** rainbow coral, crystal cluster, golden castle, treasure hoard, and a golden fish statue (50,000). Two bigger aquariums: Royal (40 fish, 6,000) and Ocean palace (64 fish, 30,000).
- **Chat you can actually find:** the server and game were both live and working; the AI checked by sending a test message to the live server. The problem was design: the Chat button only lived in the multiplayer bar, which only appears while visiting or being visited, so fishing alone there was no way to find it. **Where the AI got it wrong:** it never tested what a player sees when alone. Now a **Chat** button sits in the top bar whenever you're logged in (the one in the bar was removed so there aren't two), and the panel says who you're chatting with, or explains that chat reaches whoever is in the same world. Tested on the live server with two accounts.

### Changes I made myself

> ✏️ TODO
