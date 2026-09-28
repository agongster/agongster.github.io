# Tiny Tides

A cozy 2.5D pixel-art fishing sim. Design your angler, fish off a little dock while the sky loops from golden hour to night, collect 17 kinds of fish (and some junk), sell your catch, and spend the coins on outfits, buddies, rods and bigger buckets.

**Play it:** https://agongster.github.io/fishing-sim/
**Code:** this folder of [agongster.github.io](https://github.com/agongster/agongster.github.io)

> ✏️ **TODO (April):** The assignment requires this README to be written in your own words. The sections marked TODO are prompts for you. Everything under "AI-generated technical notes" at the bottom is labelled as AI-written, which the assignment allows.

## What it does

> ✏️ TODO: 2–4 sentences, in your voice, on what the game is and why you made it.

## How to play

> ✏️ TODO: rewrite in your own words. The facts:
> - Hold on the water (or hold Space) to charge a cast, then let go. A stronger cast lands further out.
> - Small nibbles are fake-outs. When the bobber sinks and a **!** appears, tap quickly.
> - Reeling: hold to push the golden zone right, let go and it drifts left. Keep the fish inside it until the bar fills.
> - Sell fish from the **Bucket**, then spend coins in the **Shop** (Wardrobe for cosmetics, Tackle for rods and buckets). You can try things on before buying.
> - The day cycles golden hour → sunset → dusk → night (about 75 seconds each). Some fish only appear at certain times. The **Fishdex** shows silhouettes of what's left and when each one swims.
> - Works with a mouse, touch or the keyboard. On phones it works in portrait but is roomier in landscape.

## Features I'm most proud of

> ✏️ TODO: pick 2–3 and say *why* in your own words. Candidates:
> - Every sprite (angler, 17 fish, 4 buddies, the whole scene) is drawn from code, with no image files, plus an automatic outline pass.
> - The "try before you buy" wardrobe, whose item thumbnails show *your* angler wearing each item.
> - The dithered sunset sky that blends smoothly between four palettes.
> - Fish that depend on the time of day, which gives a reason to keep playing through the whole loop.
> - Game juice: the fish arcs out of the water onto the dock, the catch card has spinning rays, the lantern and lighthouse glow at night.

## Running it locally

No build step and no dependencies. From the repo root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/fishing-sim/
```

Opening `index.html` directly also works, since everything is plain `<script>` tags.

## Secrets

There aren't any. The game has no backend and calls no APIs. The only external request is the Pixelify Sans font from Google Fonts. Progress is saved in the browser's `localStorage` under `tiny-tides-save-v1`, so nothing leaves the player's device.

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
| `data.js` | **All game content**: sky palettes, every fish (price, rarity, time of day, difficulty, colours, flavour text), cosmetics, rods, buckets. The easiest file to edit. |
| `sprites.js` | Pixel-art generation: colour helpers, the angler renderer, buddy and junk pixel maps, the procedural fish generator, and the automatic outline pass. |
| `audio.js` | Web Audio synthesised sound effects and a generative lullaby that changes chords with the time of day. |
| `game.js` | Save/load, the scene renderer, the fishing state machine, economy, and the main loop. |
| `ui.js` | DOM side: HUD, modals, shop/bucket/Fishdex rendering, and mouse/touch/keyboard input. |
| `style.css` | Warm sunset palette, pixel-bordered panels, responsive rules for phones. |

### Key technical choices

- **Low-resolution canvas.** The game renders to a 320×180 canvas and CSS scales it up with `image-rendering: pixelated`. That keeps every pixel crisp at any size and makes the whole scene cheap to draw every frame.
- **Procedural pixel art.** Characters are painted with `fillRect` in "art pixel" coordinates onto small offscreen canvases. `addOutline()` then scans the image and paints a dark outline around every filled shape, so any combination of hair, hat, top and face gets a clean outline for free. Fish are built from parameters (length, height, shape, pattern, colours) by filling an ellipse, adding a forked tail and fins, and applying a pattern. Sprites are cached.
- **Dithered sky.** The sky and water are gradients drawn with a 4×4 Bayer ordered-dither between palette bands, which gives the retro look. They're recomputed a few times a second as the four phase palettes blend.
- **2.5D.** Parallax hills, a slanted dock deck with a visible front face, and perspective in the water (wave dashes, fish shadows and the sun's reflection all grow with depth). A cast's distance also moves the bobber toward the horizon.
- **State machine.** `idle → charging → casting → waiting → bite → reeling → landing → showing`, with `retract` for misses. A single `press()` / `release()` pair drives everything, so mouse, touch, the on-screen button and the keyboard all behave identically.
- **Reeling minigame.** The fish picks targets and darts based on its `diff`. The catch zone has simple physics (holding accelerates it right, releasing pulls it left). The rod sets the zone width, fill speed and luck.
- **Saving.** `localStorage` with a debounced write, plus a write on `pagehide`/`visibilitychange`. Loaded saves go through `sanitizeSave()`, so an old or hand-edited save can't crash the game. Every storage call is wrapped in try/catch, so private browsing still works; it just won't remember progress.
- **Accessibility and robustness.** Real `<button>`s everywhere, focus is trapped inside open dialogs and returned afterwards, Escape closes menus, `aria-live` prompts, reduced-motion support, and held inputs are cancelled when the tab loses focus so the rod never gets stuck charging.
