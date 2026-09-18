# Picture Battleship: Grid Hunter

A 2-player local browser game: over 3 rounds, you secretly build the puzzle your opponent has to solve — choose their 8 candidate photos from a pool of 20 pulled from the free, keyless [Picsum Photos API](https://picsum.photos/), pick which one is the real target, and hide a fleet of ships on their 12x12 board — while they build yours. There's no ammo to pick: every tile's look is decided automatically by whether it's a miss, an unsunk ship hit, or part of a fully sunk ship, and a hit earns you another shot. Take turns firing on your own board, dodging enemy ships — each round ends the instant either of you guesses correctly.

Play it at [picsum-battleship/index.html](index.html), linked from the [Projects](../index.html#projects) section of my portfolio.

## How it works

- `GET https://picsum.photos/v2/list` supplies a pool of random photo ids (no API key needed — Picsum serves everything anonymously).
- Both boards' pools are fetched up front: 20 candidate ids each, loaded as thumbnails via `https://picsum.photos/id/{id}/{width}/{height}`.
- Setup is two short steps: first the builder clicks 8 photos from the pool of 20 (the candidates their opponent will guess from), then a second screen shows just those 8 and the builder clicks one to designate the real target — the full-resolution version only preloads once that pick is made, avoiding fetching all 20 (or even all 8) photos at full size up front. Choosing similar-looking candidates in step one makes the opponent's guess much harder.
- The target image is sliced into a 12x12 grid purely in CSS, using `background-size`/`background-position` percentages on each tile — no canvas or image-processing library required.
- There's no ammo selector. Every revealed tile's treatment is recomputed live from the board's ship state on every render: a miss is grayscale + max blur (`filter: grayscale(1) blur(5px)`), a hit on a not-yet-sunk ship is grayscale + a little less blur, and once that ship is fully sunk its tiles get sharper still — always grayscale, never fully clear. Because this is derived from live state rather than stored per-tile, previously-revealed cells visually sharpen the instant the ship they belong to gets sunk.
- Landing a hit keeps your turn going (fire again, no need to pass) — only a miss hands the turn to your opponent, tracked with a single `lastRevealWasHit` flag rather than a separate mode.
- A round ends the moment either player's board becomes `solved` (a correct guess), not when both boards finish — checked right after every shot/guess resolves, alongside the older "both boards fully revealed" fallback for when nobody ever guesses correctly. Three rounds run this way before the victory modal appears, each starting from a completely fresh pair of boards.
- Ship placement is a small in-browser Battleship layer: the 6-ship fleet (lengths 3/3/2/2/2/1), each a distinct color matching its tray legend swatch, starts randomly placed on the 12x12 grid the opponent will fire at blind, tracked as plain coordinate arrays — no server, just local game state. There's no place-one-at-a-time flow: a pointerdown/pointermove/pointerup drag handler lets you pick up any ship and drop it elsewhere (a live preview keeps showing that ship's own color if the drop spot is valid, or turns red if it isn't), while a plain click with no movement in between rotates that ship in place around its anchor cell instead.
- A ship hit triggers a brief CSS shake animation on that tile; winning the game (not a tie) bounces the result text and drops a burst of CSS-animated confetti across the screen.
- Every image load is preloaded and checked for failure first, so a dropped request falls back to a placeholder tile/thumbnail instead of breaking the game, and the decoy pool gracefully shrinks its required count if some images fail to load.

## Rules

- **Setup:** you build your opponent's board — click 8 candidate photos from a pool of 20, then pick which of those 8 is the real target (star it), then rearrange their fleet (Cruiser 3, Destroyer 3, Frigate 2, Submarine 2, Corvette 2, Scout 1), which starts randomly placed on their 12x12 grid. Drag a ship to move it, or click it (without dragging) to rotate it in place. They build yours the same way, via a pass-the-device flow.
- **Fire:** on your turn, click any tile on your *own* board. A miss reveals a maximally blurry grayscale glimpse; a ship hit reveals a slightly clearer (still grayscale) glimpse; a fully sunk ship's tiles get sharper still, but stay grayscale.
- **A hit earns another shot** — keep firing until you miss. Only a miss (or a wrong guess) passes your turn.
- If your shot lands on one of your opponent's hidden ships, **they** lose 10 points (the ship's owner is penalized, not the shooter), and the tile shakes.
- After firing, either **Guess Now** (pick from your 8 candidates) or continue. Correct guess: **+100** points minus 2 per tile revealed so far. Wrong guess: **&minus;20** points, and your turn ends regardless of any hit streak.
- **A round ends the instant either player guesses correctly** — the other player doesn't get to finish their own board that round. If neither of you ever guesses right, a round instead ends once both boards are fully revealed with no correct guess.
- The game runs 3 rounds, each with a freshly built pair of boards. Highest total score after all 3 wins!

## Files

- `index.html` — page structure: scoreboard, pass-device gate, three-step setup panel (choose 8 candidates, choose the target, place ships), play panel, victory modal with a confetti layer.
- `style.css` — game-specific styling; inherits colors, fonts, and the dark/light toggle from `../styles.css` so this page matches the rest of the site.
- `game.js` — all game logic: Picsum fetching, image preloading/fallbacks, the two-board setup flow (candidate-pool selection, target selection, drag-to-move/click-to-rotate ship placement), per-board turn state including the hit-streak rule, the live tier-based reveal system, scoring, shake/confetti effects, and game-over handling.
- `prompt_log.md` — AI-assisted development log for this project.

No build step or dependencies — it's plain HTML/CSS/JS, just like the rest of this site.
