// Print the full log of one bot game — a quick way to eyeball the rules flow.
// Usage: npx vite-node tools/simlog.ts [villain] [seed] [hero,hero,hero]
import { playGame } from '../tests/bot';
import type { HeroId, VillainId } from '../src/types';

const villain = (process.argv[2] as VillainId) || 'redskull';
const seed = process.argv[3] || 'demo';
const heroes = ((process.argv[4] || 'ironman,hulk,wasp').split(',') as HeroId[]);

const r = await playGame({ villain, heroes, seed }, 3);
for (const l of r.state.log) console.log(`[${String(l.turn).padStart(2)}] ${l.msg}`);
console.log(`\n=== ${r.state.gameOver!.title}: ${r.state.gameOver!.sub} (${r.turns} hero turns)`);
console.log(`missions ${JSON.stringify(r.state.missions)} villain health ${r.state.villainHealth} fear ${r.state.track}`);
