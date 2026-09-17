# Marvel United — S.H.I.E.L.D. solo (browser)

A browser implementation of the **S.H.I.E.L.D. solo mode** of *Marvel United* (CMON, Core Set):
you coordinate three Heroes with one shared deck against Red Skull, Ultron or Taskmaster.

Personal use only. Card data was transcribed from the physical cards; the art is
not included in the repository (see *Art* below).

Built with **Vite + TypeScript (strict) + React**, the same shape as
[legendary_encounters_the_matrix](https://github.com/alver/legendary_encounters_the_matrix):
the engine (`src/engine/`) is framework-free and talks to any front end through the
`UIPort` interface — the React UI and the headless test bot are two implementations
of that seam.

## Run

```bash
npm install
npm run dev          # open the printed URL (http://localhost:5173/)
npm test             # data invariants, engine rules, bot simulation
npm run build        # typecheck + bundle into dist/
npm run sim          # 200 bot games per Villain, prints win rates
npx vite-node tools/simlog.ts redskull someseed ironman,hulk,wasp   # one game's full log
```

Quick start / testing: `/?villain=ultron&heroes=ironman,hulk,wasp&seed=abc&auto=1`
skips the setup screen. Add `&challenge=heroic` for a Challenge.

## What is implemented

- **Core Set content**: 8 Heroes (Iron Man, Captain America, Black Widow, Hulk, Captain Marvel,
  Ant-Man, Wasp, Venom), 3 Villains with their 12 Master Plan cards, 6 Threat cards and
  dashboards (Fear Track, Overflow, Villainous Plot, Taskmaster's special rules), the 8 Locations
  with End of Turn effects and starting tokens, the 3 Missions and the 3 Challenge cards.
- **Solo rules** per the rulebook + the designers' rulings (hallofunited.com): 3 Heroes, one
  shuffled deck, 5-card hand, play any Hero's card, Villain health for 3 players, damage per
  Hero, "draw until 3" literally, 3 cards on the third Mission, Invulnerable lasts until that
  Hero's next activation, Hail Hydra! order of resolution, henchmen BAM!s clockwise from the
  Villain, only the dashboard BAM! on a KO, Elite Thugs need 2 damage in one turn, Taskmaster's
  Crisis rules (one Crisis per overflowing Location), Ultron's clockwise overflow, Quantum Leap
  re-enabling the swapped card's special, wounded-thug tracking for Hulk Smash!, etc.
- **Quality of life**: click-to-act board, hover previews, undo (snapshot per action), log,
  seedable games, in-game help, optional "forgiving KO" rule (lose on the 2nd KO).

## Art

The game is fully playable without images (cards are rendered with CSS + SVG symbols), but it is
built for the real scans. Put them in `resources/` (gitignored, see the layout below) and run

```bash
npm run assets       # node tools/build-assets.mjs — needs ImageMagick 7 (`magick` on PATH)
```

The script slices the 6x2 / 3x2 / 4x2 card sheets into single cards, rotates the Threat cards
upright, resizes everything to 2x its on-screen size and writes web-optimized **WebP** files plus a
`manifest.json` into `public/img/` (gitignored, ~7 MB for the Core Set). At start-up the app reads
the manifest and uses a scan wherever one exists, falling back to CSS otherwise, so partial sets
work. Re-running only converts missing files (`--force` redoes everything).

Expected `resources/` layout (the names of the Core Set scans):

```
resources/
  Challenges and Mission cards.png          4x2: Hard, Heroic, Moderate, back, Rescue, Defeat, Clear, Clear
  heroes/<Hero> front.jpg|png               6x2 sheet of the 12 cards (order per hero in tools/build-assets.mjs)
  heroes/<Hero> back.jpg, <Hero> figure.png card back, painted mini render (alpha)
  villains/<Villain> master plan front.jpg  6x2 sheet · master plan back.jpg
  villains/<Villain> thread front.png       3x2 sheet of the 6 Threats, printed rotated · thread back.jpg
  villains/<Villain> dashboard front.jpg    1575x700 · dashboard back.jpg · figure.png
  locations/<Location>.jpg, back.jpg        1637x1637 squares
  tokens/*.png                              attack, civilian, crisis, health, heroic, invulnerable, ko, move, threat, thug, wild
```

On the board the live state is overlaid on the printed art: tokens on the Location slots, the
Threat card over the End of Turn box, Heroic tokens / remaining health on the Threat, the Fear
marker and health on the dashboard, tokens on the Mission cards, painted minis as the Heroes and
the Villain. The deck shows the back of its top card (the solo rules let you use that information).

## Project layout

```
src/
  types.ts            shared types (defs, GameState, UIPort)
  data/               heroes.ts, villains.ts, locations.ts — the card database
  engine/game.ts      the engine: setup, Villain turn, Hero turn, actions, missions
  engine/scripts.ts   card text as code: specials, Master Plan effects, Threats, Locations
  engine/rng.ts       seedable PRNG kept inside the state
  ui/                 React front end (store.ts is the engine↔React seam)
  styles/             CSS
tests/                Vitest: data invariants, engine rules, bot simulation (bot.ts)
tools/                build-assets.mjs (scans → WebP), simlog.ts
rules/                the official rulebook PDF
resources/            your scans (gitignored) → public/img/ (gitignored)
```

## Engine notes

- The whole game state is one JSON-serializable object `G`; **undo** is a snapshot/restore of it.
- The Hero turn is driven by the UI through `playCard`, `moveHero`, `attack`, `heroic`,
  `useSpecial`, `endTurn`; the Villain turn runs automatically after every 3 (2 when Under
  Pressure) Hero cards and prompts through the `UIPort` when a card gives the player a choice
  (prevent a BAM! with Crisis tokens, pick which card to discard, …).
- Expiring resources are spent first: own symbol → Wild symbol → saved token → Wild token.
