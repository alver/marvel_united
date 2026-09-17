// Headless simulation: the bot plays full games against every villain. This is a
// crash test for the rules engine (every prompt path, every card) plus a rough
// balance read-out. Run more games with: SIM_GAMES=200 npm test -- tests/sim.test.ts
import { describe, expect, it } from 'vitest';
import { HEROES, VILLAINS } from '../src/data';
import type { HeroId } from '../src/types';
import { playGame } from './bot';

const N = Number(process.env.SIM_GAMES || 12);

function pickHeroes(i: number): HeroId[] {
  const ids = HEROES.map(h => h.id);
  const a = ids[i % ids.length];
  const b = ids[(i * 3 + 1) % ids.length];
  const c = ids[(i * 5 + 2) % ids.length];
  const set = Array.from(new Set([a, b, c]));
  let k = 0;
  while (set.length < 3) set.push(ids[(i + 7 * ++k) % ids.length]);
  return Array.from(new Set(set)).slice(0, 3) as HeroId[];
}

describe('bot simulation', () => {
  for (const v of VILLAINS) {
    it(`plays ${N} games against ${v.name} without errors`, async () => {
      let wins = 0;
      let turns = 0;
      const reasons: Record<string, number> = {};
      for (let i = 0; i < N; i++) {
        const heroes = pickHeroes(i);
        const r = await playGame({ villain: v.id, heroes, seed: `${v.id}-${i}` }, i + 1);
        expect(r.state.gameOver).not.toBeNull();
        if (r.state.gameOver!.win) wins++;
        else reasons[r.state.gameOver!.title] = (reasons[r.state.gameOver!.title] || 0) + 1;
        turns += r.turns;
      }
      // eslint-disable-next-line no-console
      console.log(
        `${v.name}: ${wins}/${N} wins, avg ${(turns / N).toFixed(1)} hero turns; losses: ${JSON.stringify(reasons)}`
      );
    });
  }
});
