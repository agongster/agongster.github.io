# Tiny Tides

A cozy 2.5D pixel-art fishing sim. Design your angler, fish off a little dock (and later sail to six more islands) while the sky loops from sunrise to night, collect 172 kinds of fish (plus junk, and LeBron James), keep your favourites in an aquarium, sell the rest, and spend the coins on outfits, buddies, rods, bigger buckets and bigger tanks.

**Play it:** https://agongster.github.io/fishing-sim/
**Code:** this folder of [agongster.github.io](https://github.com/agongster/agongster.github.io)

## What it does

Tiny Tides is a fishing simulator! Players can explore the map, cast out their lines in anticipation of fish, and play with and gift to friends. I personally  enjoy fishing games and initially took a lot of inspiration from Stardew Valley fishing, which I built upon, making the mechanics significantly different and focusing more largely on cosmetics and fish types. I really just wanted to make something fun and interesting that I could play with my friends!

## How to play

To play, tap the water where you want to cast, ideally in front of or generally near a fish shadow. If you cast too close to the fish, they'll get spooked and leave. Generally, the larger the shadow is, the more rare a fish will be, and the harder it is to catch it. Once a fish hooks onto your tackle, wait until the screen indicates to TAP, and then press the arrow keys or drag on the screen to follow the fish and reel it in.

Once successfully reeled, you can sell the fish directly off the line, place in your Bucket or Tank, and spend coins in the Shop. In the Shop, buy different clothes and customizations, home and tank decor, and upgrade bucket/tank storage or the tackle.

As you catch more fish, you unlock new locations on the Map. Each has its own scenery and fish, and you sail there by boat. 

In your Home, you can decorate the space, view tanks, and invite friends. Multiplayer features allow users to visit friends, chat with them, and gift them coins or fish. 

## Features I'm most proud of

I'm most proud of the multiplayer features and the ability to host multiple players on a backend server at the same time. From my experience playing with others, I think being able to save account information, gift and interact with others really brings the game together. I'm also proud of the fishing mechanics--Claude had originally designed the mechanics to be very similar to the Stardew Valley fishing mechanics, so I decided to adjust them to make it more original, and have the user essentially "chase" the fish in all four dimensions. I was surprised by how well and how quickly Claude was able to create the sound and art components for the game as well.

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

The game itself holds no secrets: it's static files, and the only external requests are the Pixelify Sans heading font from Google Fonts (the body font, Jersey 10, is served from `fonts/`) and, when you play online, the game's own API. Progress is saved in the browser's `localStorage`.

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
- **Fishing together:** when you're in the same world (up to four anglers), you see each other on the dock or boat with name tags, casting lines and bobbers, and fish flying out of the water when someone catches one. Wave or send a heart, or open **Chat**: every world is its own chat room, messages pop up over the sender's head (on bigger screens), and anyone who joins sees the last 30 messages. The server trims each message to 150 characters and allows 5 per 10 seconds per player.
- **Exploring a friend's world:** visitors can sail anywhere on the host's map (every spot the host has unlocked, even ones the visitor hasn't reached yet). You only see anglers at the same spot as you. The map and the visiting bar show where the host is, with a **Join them** button. If you're at the same spot when the host sails off, you follow them.
- **Gifts:** send 1–1000 coins with an optional note (up to 2000 a day). An online friend gets them instantly; otherwise they arrive next time they play.
- **Dev mode** is off while logged in, so online coins stay fair.

## How I used AI

I used AI to develop all the different features in the game, specifying the mechanics I wanted, giving it a general direction to go in, and adjusting if there were areas that weren't as envisioned. The code is all fully written by Claude Opus 5.5. 

I directed the individual features of the game, while Claude came up with general sprite designs, descriptions, instructions, etc. along with the sound components. If there were features that were not working, I would prompt Claude with a description of the error for it to fix. Many of the feature changes and additions were also based on active user feedback from friends who were playing the game. Full details of my prompts are in prompt_log.md. There would be small errors at times, like the overlay of usernames in the multiplayer setting, or UX details that I would use AI to improve, like being able to return to fishing directly from the user's home, or receiving notifications for gifts from other users.

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
| `index.html` | Page structure: HUD, the canvas stage, and the modals (title, shop/creator, tank, Fishdex, catch card). |
| `data.js` | **All game content**: the six sky palettes, the seven locations (unlock requirement, colour tint, scenery), every fish (price, rarity, location, time of day, difficulty, colours, flavour text), cosmetics, rods, buckets, tanks and tank props. The easiest file to edit. |
| `sprites.js` | Pixel-art generation: colour helpers, the angler renderer, buddy and junk pixel maps, the procedural fish generator, and the automatic outline pass. |
| `audio.js` | Web Audio synthesised sound effects and a generative lullaby that changes chords with the time of day. |
| `game.js` | Save/load, the scene renderer, the fishing state machine, economy, and the main loop. |
| `online.js` | Accounts, cloud saves, friends and gifts: the API calls, sync and conflict handling, and the Friends/Gifts/Account menu. |
| `net.js` | Fishing together: the live connection to a world, visiting and going home, and drawing other players. |
| `dev.js` | The dev-mode panel (fish picker and testing shortcuts). |
| `home.js` | The home room: drawing it (wallpaper, floor, window, furniture, tanks), decorating it, and the Shop's Home tab. |
| `ui.js` | DOM side: HUD, modals, shop/tank/Fishdex rendering, and mouse/touch/keyboard input. |
| `style.css` | Warm sunset palette, pixel-bordered panels, responsive rules for phones. |

### Key technical choices

- **Low-resolution canvas.** The game renders to a 320×180 canvas and CSS scales it up with `image-rendering: pixelated`. That keeps every pixel crisp at any size and makes the whole scene cheap to draw every frame.
- **Procedural pixel art.** Characters are painted with `fillRect` in "art pixel" coordinates onto small offscreen canvases. `addOutline()` then scans the image and paints a dark outline around every filled shape, so any combination of hair, hat, top and face gets a clean outline for free. Fish are built from parameters (length, height, shape, pattern, colours) by filling an ellipse, adding a forked tail and fins, and applying a pattern. Sprites are cached.
- **Dithered sky.** The sky and water are gradients drawn with a 4×4 Bayer ordered-dither between palette bands, which gives the retro look. They're recomputed a few times a second as the four phase palettes blend.
- **2.5D.** Parallax hills, a slanted dock deck with a visible front face, and perspective in the water (wave dashes, fish shadows and the sun's reflection all grow with depth). A cast's distance also moves the bobber toward the horizon.
- **State machine.** `idle → casting → waiting → bite → reeling → landing → showing`, plus `retract` for misses and `sailing` for travel. A single `press(pos)` / `release()` pair drives everything, so mouse, touch, the on-screen button and the keyboard all behave the same. A tap passes its canvas position so you can aim; the keyboard and button cast at a drifting marker.
- **Fish shadows.** Five shadows swim around, and each has already rolled its species (from the current location and time of day), with size set by rarity. When the bobber lands, any shadow within a few pixels flees, and the nearest one within range becomes "interested", swims over, nibbles, then bites. If nothing notices, a stray bite eventually happens (weighted toward junk), so a player is never stuck.
- **Chase reel.** An underwater panel opens with a generic shadow of the fish. It's bigger for rarer catches but otherwise gives nothing away, and the real fish is only revealed when it flies onto the dock. The fish picks targets and sometimes darts, depending on its `diff`, and its speed is capped so the net can always keep up. The net has simple physics: arrow keys, WASD, the D-pad or a dragged finger accelerate it, and water drag slows it down. The bar fills while the fish is in the net and drains otherwise, after a short grace period. The rod sets net size, fill speed, how fast the net can move, how much of the drain you feel, and luck. Rods never slow the fish down; rarer fish swim faster and fight harder. **Enchantments** turn up tangled on the line now and then (about one catch in 16). You keep them in **Charms** and use one whenever you like, for extra luck, a bigger net, or both, for a minute or two of fishing time.
- **Locations.** Each location tints the four sky palettes, swaps the landmark (lighthouse, willow, palms, icebergs with an aurora), the foreground props, and the platform (a dock at home, a bobbing rowboat elsewhere). Unlocks are recomputed from the Fishdex count on load, so they can't get out of sync with the save.
- **Aquarium.** Fish in `save.aquarium` get a swimmer (position, target, facing) that lives only in the UI. They wander to random points, pause sometimes, and blow bubbles. Anything flagged `bottom: true` in `data.js` (crabs, junk, LeBron) walks along the sand instead. The tank upgrades in the Tackle shop.
- **Pausing.** Opening a menu mid-cast freezes the fishing (but not the scenery), so checking your tank never costs you a fish.
- **Saving.** `localStorage` with a debounced write, plus a write on `pagehide`/`visibilitychange`. Loaded saves go through `sanitizeSave()`, so an old or hand-edited save can't crash the game. Every storage call is wrapped in try/catch, so private browsing still works; it just won't remember progress.
- **Accessibility and robustness.** Real `<button>`s everywhere, focus is trapped inside open dialogs and returned afterwards, Escape closes menus, `aria-live` prompts, reduced-motion support, and held inputs are cancelled when the tab loses focus so the rod never gets stuck charging.
