// rng.ts — tiny seedable PRNG (mulberry32) whose state lives inside GameState,
// so a game is fully reproducible from its seed and undo snapshots stay exact.

export function seedToState(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

// Advances the state and returns [nextState, float in [0,1)]
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const r = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return [t, r];
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
