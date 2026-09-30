# Tiny Tides

A cozy 2.5D pixel-art fishing sim. Design your angler, fish off a little dock (and later sail to six more islands) while the sky loops from sunrise to night, collect 72 kinds of fish (plus junk, and LeBron James), keep your favourites in an aquarium, sell the rest, and spend the coins on outfits, buddies, rods, buckets and bigger tanks.

**Play it:** https://agongster.github.io/fishing-sim/
**Code:** this folder of [agongster.github.io](https://github.com/agongster/agongster.github.io)

> ✏️ **TODO (April):** The assignment requires this README to be written in your own words. The sections marked TODO are prompts for you. Everything under "AI-generated technical notes" at the bottom is labelled as AI-written, which the assignment allows.

## What it does

> ✏️ TODO: 2–4 sentences, in your voice, on what the game is and why you made it.

## How to play

> ✏️ TODO: rewrite in your own words. The facts:
> - Tap the water where you want to cast (or press Space to cast at the drifting marker).
> - The shadows under the water are the actual fish, and bigger shadows are rarer. Cast just ahead of one to lure it in; land right on top of it and it gets spooked.
> - Small nibbles are fake-outs. When the bobber sinks and a **!** appears, tap quickly.
> - Reeling is a chase: an underwater view opens with a mystery shadow (bigger = rarer) and you steer a net with the arrow keys / WASD (or drag, or the on-screen D-pad on phones). Keep the fish inside the net until the bar fills; if the bar empties, it gets away.
> - Sell fish from the **Bucket**, then spend coins in the **Shop** (Wardrobe for your angler, Boat for your boat's style (a rowboat, a swan, a duck parade, a bathtub, a banana...), colours, sail, flag and decorations, Tackle for rods, buckets and tanks). You can try things on before buying.
> - Catch more fish to unlock new spots on the **Map**: Lily Lagoon (12), Coral Cove (30), Aurora Bay (55), Blossom River (80), Ember Isle (110) and Cloud Lake (150). Each has its own scenery and fish, and you sail there by boat.
> - Put fish you like in the **Tank** (from the catch card or the bucket) to watch them swim around. Tap one to see its name, and sell from the tank whenever you like.
> - The day cycles sunrise → daytime → golden hour → sunset → dusk → night (about 65 seconds each), and the sun travels across the sky. Some fish only appear at certain times. The **Fishdex** shows silhouettes of what's left, where each one lives, and when it swims.
> - Works with a mouse, touch or the keyboard. On phones it works in portrait but is roomier in landscape.

## Features I'm most proud of

> ✏️ TODO: pick 2–3 and say *why* in your own words. Candidates:
> - Every sprite (angler, 17 fish, 4 buddies, the whole scene) is drawn from code, with no image files, plus an automatic outline pass.
> - The "try before you buy" wardrobe, whose item thumbnails show *your* angler wearing each item.
> - The dithered sunset sky that blends smoothly between four palettes.
> - Fish that depend on the time of day and the location, which gives a reason to keep playing through the whole loop.
> - Visible fish shadows you can aim for, and a 2D underwater chase for reeling (steering in two directions instead of Stardew Valley's one).
> - The sea chart and the sailing trip between seven hand-coloured locations.
> - Boat customization: nine silly boat styles (cardboard box, banana, watermelon, bathtub, teacup, giant sneaker, swan, duck parade with ducklings), sail designs, flags, string lights that glow at night, a solid gold hull. Your boat shows up tied at the dock, at every other spot, while sailing, and on the sea chart.
> - Fishing together with friends: live casts, catches and emotes, visiting each other's worlds, and gifting coins.
> - The aquarium, where fish swim, crabs (and LeBron) walk along the sand, and tapping a fish shows its name.
> - Game juice: the fish arcs out of the water onto the dock, the catch card has spinning rays, the lantern and lighthouse glow at night.

## Running it locally

No build step and no dependencies. From the repo root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/fishing-sim/
```

Opening `index.html` directly also works, since everything is plain `<script>` tags.

## Dev mode

Add `?dev` to the URL (for example `http://localhost:8000/fishing-sim/?dev`), or press the backtick key (`` ` ``) in game. A small panel lets you:
- pick exactly which fish bites next, grouped by location
- turn on instant bites
- hook or win a fish immediately
- add 1,000 coins
- unlock every island
- jump to any time of day

It's useful for testing and for recording a demo. Dev catches still count toward the Fishdex.

## Secrets

The game itself holds no secrets: it's static files, and the only external request is the Pixelify Sans and Tiny5 fonts from Google Fonts. Progress is saved in the browser's `localStorage`.

Online play (optional) talks to a separate backend, [tiny-tides-backend](https://github.com/agongster/tiny-tides-backend) (FastAPI on Render, Postgres on Neon).
- **Server secrets:** the database password and the key that signs login tokens are only in Render's environment settings, never in either repository.
- **Passwords:** hashed with bcrypt on the server.
- **What the browser keeps:** a login token in `localStorage`, and nothing else sensitive.
- **Local testing:** the game accepts `?api=` for a local backend, but only `localhost` addresses. Otherwise a crafted link could make the login form send a password to someone else's server.

## Playing with friends

Tap **Log in** (top bar, or on the title screen) to sign up with an email, a unique username and a password. You can log in with either the email or the username.

- **Cloud saves:** progress uploads a few seconds after it changes and when you close the tab. Every upload carries a version number, so an old tab can't overwrite newer progress. If this device and your account have both changed, the game asks which to keep.
- **Friends:** add people by username from the **Friends** button. Requests and acceptances pop up live, and the list shows who's online and where they're fishing.
- **Visiting:** **Visit** sails you to a friend's world: their island, their boat, their time of day. You can peek at their aquarium, but it's read-only. If they're offline, their angler naps on the dock and you can fish there anyway.
- **Fishing together:** when you're in the same world (up to four anglers), you see each other on the dock or boat with name tags, casting lines and bobbers, and fish flying out of the water when someone catches one. Wave or send a heart. When the host sails somewhere, visitors follow.
- **Gifts:** send 1–1000 coins with an optional note (up to 2000 a day). An online friend gets them instantly; otherwise they arrive next time they play.
- **Dev mode** is off while logged in, so online coins stay fair.

## How I used AI

> ✏️ TODO (required, and weighted heavily): summarise how you used AI, in your own words. Suggested points: which tool(s) (Claude Code with Claude Opus 5.5 built the first version), what you directed versus what it wrote, what you changed yourself, and where it went wrong. Full details are in [prompt_log.md](prompt_log.md).

## Credits

- Font: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License), via Google Fonts.
- Code: first version generated with Claude Code (Anthropic, Claude Opus 5.5), directed and then modified by April Gong. See the prompt log.
- Art, music and sound effects: generated procedurally by the game's own code. No third-party assets.

---

## AI-generated technical notes

*This section was written by Claude (AI), not by April.*

### File layout

| File | What's in it |
| --- | --- |
| `index.html` | Page structure: HUD, the canvas stage, and the modals (title, shop/creator, bucket, Fishdex, catch card). |
| `data.js` | **All game content**: the six sky palettes, the seven locations (unlock requirement, colour tint, scenery), every fish (price, rarity, location, time of day, difficulty, colours, flavour text), cosmetics, rods, buckets, tanks. The easiest file to edit. |
| `sprites.js` | Pixel-art generation: colour helpers, the angler renderer, buddy and junk pixel maps, the procedural fish generator, and the automatic outline pass. |
| `audio.js` | Web Audio synthesised sound effects and a generative lullaby that changes chords with the time of day. |
| `game.js` | Save/load, the scene renderer, the fishing state machine, economy, and the main loop. |
| `online.js` | Accounts, cloud saves, friends and gifts: the API calls, sync and conflict handling, and the Friends/Gifts/Account menu. |
| `net.js` | Fishing together: the live connection to a world, visiting and going home, and drawing other players. |
| `dev.js` | The dev-mode panel (fish picker and testing shortcuts). |
| `ui.js` | DOM side: HUD, modals, shop/bucket/Fishdex rendering, and mouse/touch/keyboard input. |
| `style.css` | Warm sunset palette, pixel-bordered panels, responsive rules for phones. |

### Key technical choices

- **Low-resolution canvas.** The game renders to a 320×180 canvas and CSS scales it up with `image-rendering: pixelated`. That keeps every pixel crisp at any size and makes the whole scene cheap to draw every frame.
- **Procedural pixel art.** Characters are painted with `fillRect` in "art pixel" coordinates onto small offscreen canvases. `addOutline()` then scans the image and paints a dark outline around every filled shape, so any combination of hair, hat, top and face gets a clean outline for free. Fish are built from parameters (length, height, shape, pattern, colours) by filling an ellipse, adding a forked tail and fins, and applying a pattern. Sprites are cached.
- **Dithered sky.** The sky and water are gradients drawn with a 4×4 Bayer ordered-dither between palette bands, which gives the retro look. They're recomputed a few times a second as the four phase palettes blend.
- **2.5D.** Parallax hills, a slanted dock deck with a visible front face, and perspective in the water (wave dashes, fish shadows and the sun's reflection all grow with depth). A cast's distance also moves the bobber toward the horizon.
- **State machine.** `idle → casting → waiting → bite → reeling → landing → showing`, plus `retract` for misses and `sailing` for travel. A single `press(pos)` / `release()` pair drives everything, so mouse, touch, the on-screen button and the keyboard all behave the same. A tap passes its canvas position so you can aim; the keyboard and button cast at a drifting marker.
- **Fish shadows.** Five shadows swim around, and each has already rolled its species (from the current location and time of day), with size set by rarity. When the bobber lands, any shadow within a few pixels flees, and the nearest one within range becomes "interested", swims over, nibbles, then bites. If nothing notices, a stray bite eventually happens (weighted toward junk), so a player is never stuck.
- **Chase reel.** An underwater panel opens with a generic shadow of the fish. It's bigger for rarer catches but otherwise gives nothing away, and the real fish is only revealed when it flies onto the dock. The fish picks targets and sometimes darts, depending on its `diff`, and its speed is capped so the net can always keep up. The net has simple physics: arrow keys, WASD, the D-pad or a dragged finger accelerate it, and water drag slows it down. The bar fills while the fish is in the net and drains otherwise, after a short grace period. The rod sets net size, fill speed and luck.
- **Locations.** Each location tints the four sky palettes, swaps the landmark (lighthouse, willow, palms, icebergs with an aurora), the foreground props, and the platform (a dock at home, a bobbing rowboat elsewhere). Unlocks are recomputed from the Fishdex count on load, so they can't get out of sync with the save.
- **Aquarium.** Fish in `save.aquarium` get a swimmer (position, target, facing) that lives only in the UI. They wander to random points, pause sometimes, and blow bubbles. Anything flagged `bottom: true` in `data.js` (crabs, junk, LeBron) walks along the sand instead. The tank upgrades in the Tackle shop.
- **Pausing.** Opening a menu mid-cast freezes the fishing (but not the scenery), so checking your bucket never costs you a fish.
- **Saving.** `localStorage` with a debounced write, plus a write on `pagehide`/`visibilitychange`. Loaded saves go through `sanitizeSave()`, so an old or hand-edited save can't crash the game. Every storage call is wrapped in try/catch, so private browsing still works; it just won't remember progress.
- **Accessibility and robustness.** Real `<button>`s everywhere, focus is trapped inside open dialogs and returned afterwards, Escape closes menus, `aria-live` prompts, reduced-motion support, and held inputs are cancelled when the tab loses focus so the rod never gets stuck charging.
