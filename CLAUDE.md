# Marvel United solo — project reference

Browser implementation of Marvel United's S.H.I.E.L.D. solo mode (Core Set: 8 Heroes, Red Skull /
Ultron / Taskmaster). Vite + React 19 + TypeScript strict + Vitest. Same architecture as the
Legendary Encounters: The Matrix project: framework-free engine, `UIPort` seam, headless bot.

## Commands

- `npm run dev` — dev server. `npm test` — all tests. `npm run typecheck`. `npm run build`.
- `SIM_GAMES=100 npx vitest run tests/sim.test.ts` — bot games, prints win rates.
- `npx vite-node tools/simlog.ts <villain> <seed> <h1,h2,h3>` — one game's log.
- `npm run assets` — slice `resources/` scans into `public/img/**` WebP + `manifest.json` (ImageMagick 7).

## Where things live

- `src/data/*.ts` — card database. Card text uses `{move} {attack} {heroic} {wild} {thug} {civilian}`
  placeholders rendered as icons. `special.key` / `threat.key` / `endOfTurn.key` select scripts.
- `src/engine/game.ts` — state `G` (plain JSON, undo = snapshot), setup, `villainTurn`, `playCard`,
  actions (`moveHero`, `attack`, `heroic`, `useSpecial`, `endTurn`), payment (`pay`: symbol → wild
  symbol → token → wild token), missions, damage/KO, overflow (`addToken` with `OverflowCtx`).
- `src/engine/scripts.ts` — registries `heroSpecials`, `planSpecials`, `threatEnter`, `threatBam`,
  `locationEffects`. Passive Threat rules (elite thugs, traps, Bob, Ultron Virus) are handled
  inline in game.ts by `threatKey(loc)`.
- `src/ui/store.ts` — `run()` wraps every action with a snapshot; prompts become `ModalRequest`s.
- `tests/bot.ts` — `playGame(opts)` drives full games through the public engine API.

## Rules decisions (from the rulebook + hallofunited.com rulings)

- Solo: Villain health = 3-player value; damage "to each Hero here" = one discard per Hero;
  3rd Mission draws 3; "draw until 3" is literal; Invulnerable lasts until that Hero's next
  activation; an empty hand at the end of a turn KOs the active Hero; a KO is a loss unless
  `koLimit` is 1 (forgiving variant suggested by the designers).
- Hail Hydra!: per Location (clockwise from Red Skull) with Heroes AND Civilians: damage each
  Hero, discard Civilians, Fear += discarded.
- Henchmen BAM!s resolve after the Villain's, clockwise from the Villain; a KO triggers only the
  dashboard BAM!. Madame Hydra / Crossbones can be prevented by ANY Hero taking Crisis.
- Elite Thugs: 2 damage in the same turn (`LocationState.wounded` resets at end of turn).
- Taskmaster: Crisis on a Location can be discarded with attack/heroic only if the Location has
  no Thugs and no Civilians; overflow adds one Crisis per Location per effect; no damage to him
  while any Location has Crisis. Photon Blast can remove Crisis in the adjacent Location.
- Ultron overflow: token goes to the next clockwise Location with room; full board = loss.
- Quantum Leap: the swapped-in card's special becomes usable; pool = its symbols + previous card
  minus what was already spent.
- Hulk Smash! does not damage the Villain before 2 Missions; discarded Civilians don't count for
  the Mission.

## Conventions

- Keep `GameState` plain data (no class instances, no functions).
- Every card effect must work headless: the bot's `UIPort` answers every prompt; run the sim
  after touching scripts.
- `resources/` (raw scans) and `public/img/` (generated WebP) are gitignored (personal-use art).
- `src/ui/assets.ts` — `img(A.card(id))` returns the URL or null (manifest lookup); every component
  renders a CSS fallback when null. Overlay geometry (slot positions etc.) is in Board.tsx /
  Panels.tsx / Card.tsx as percentages of the scan, measured on the Core Set cards.
- Sheet cell → card id mappings live in `tools/build-assets.mjs`; card ids come from `src/data`.
