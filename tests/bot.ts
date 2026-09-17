// bot.ts — a headless S.H.I.E.L.D. player: implements the UIPort with simple
// heuristics and drives whole games through the public engine API. Used by the
// simulation test and handy for smoke-testing rules changes.

import type { CardInst, ChoiceOption, GameState, PickOpts, Sym, Target, UIPort } from '../src/types';
import { HERO_CARD_BY_ID } from '../src/data';
import * as E from '../src/engine/game';

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function botUI(seed = 1): UIPort {
  const rnd = mulberry(seed);
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
  return {
    async choose<T>(_title: string, _prompt: string, options: ChoiceOption<T>[]) {
      if (!options.length) return null;
      // prefer preventing damage when the price is Crisis tokens on a hero with few of them
      const safe = options.filter(o => !o.danger);
      return (safe.length ? pick(safe) : pick(options)).value;
    },
    async pickCards(cards: CardInst[], opts: PickOpts) {
      // discard the "worst" card: fewest symbols, no special
      const score = (c: CardInst) => {
        const d = HERO_CARD_BY_ID[c.id];
        return d.syms.length + (d.special ? 1.5 : 0) + (d.syms.includes('wild') ? 0.5 : 0);
      };
      const sorted = [...cards].sort((a, b) => score(a) - score(b));
      return sorted.slice(0, Math.max(opts.min, 1));
    },
    async pickLocation(_t, candidates) {
      return candidates.length ? pick(candidates) : null;
    },
    async pickHero(_t, candidates) {
      return candidates.length ? pick(candidates) : null;
    },
    async showCard() {},
    render() {},
  };
}

// Score of a Location for the active Hero: how much useful stuff is there.
function locScore(loc: number): number {
  const G = E.g();
  const L = G.locations[loc];
  let s = L.thugs * 1.2 + L.civilians * 1.0;
  if (L.threat) s += 2;
  if (G.villainLoc === loc && E.villainDamageable()) s += 6;
  return s;
}

async function heroActions(): Promise<void> {
  const G = E.g();
  for (let guard = 0; guard < 60; guard++) {
    const t = G.turn;
    if (!t || G.gameOver) return;
    const h = G.heroes[t.heroIdx];
    const loc = h.loc;
    // remote attacks first
    if (t.remote && t.remote.n > 0) {
      const ts = E.attackTargets(t.remote.loc);
      if (ts.length) {
        await E.attack(bestAttack(ts));
        continue;
      }
      t.remote = null;
    }
    // attack here
    const at = E.attackTargets(loc).filter(x => E.canAttack(x));
    if (at.length) {
      await E.attack(bestAttack(at));
      continue;
    }
    // heroic here
    const ht = E.heroicTargets(loc).filter(x => E.canHeroic(x));
    if (ht.length) {
      const pref = ht.find(x => x.kind === 'threat') ?? ht[0];
      await E.heroic(pref);
      continue;
    }
    // special (only the safe/always-good ones automatically; targeted ones too — the bot UI answers)
    if (E.canUseSpecial()) {
      const key = HERO_CARD_BY_ID[t.playedId].special!.key;
      const skip = key === 'quantum_leap' && !G.storyline.some(e => e.kind === 'hero' && e.hero === 'antman' && e.uid !== t.playedUid);
      if (!skip) {
        await E.useSpecial();
        continue;
      }
      t.specialUsed = true;
    }
    // move towards something useful
    if (E.canPay('move', E.moveCost(loc))) {
      const cands = [E.nextLoc(loc, 1), E.nextLoc(loc, -1)].filter(l => E.canMoveTo(l));
      if (cands.length) {
        const best = cands.sort((a, b) => locScore(b) - locScore(a))[0];
        const useful = E.canPay('attack') || E.canPay('heroic') || E.canPay('wild');
        if (locScore(best) > 0 && (useful || locScore(best) > locScore(loc))) {
          await E.moveHero(best);
          continue;
        }
      }
    }
    return;
  }
}

function bestAttack(ts: Target[]): Target {
  const order: Target['kind'][] = ['villain', 'threat', 'thug', 'crisis', 'civilian'];
  return [...ts].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
}

function chooseCard(): CardInst {
  const G = E.g();
  const hand = G.hand;
  // prefer a card whose Hero stands somewhere with things to do, then more symbols
  const score = (c: CardInst) => {
    const d = HERO_CARD_BY_ID[c.id];
    const hi = G.heroes.findIndex(h => h.id === d.hero);
    const here = locScore(G.heroes[hi].loc);
    const around = Math.max(locScore(E.nextLoc(G.heroes[hi].loc, 1)), locScore(E.nextLoc(G.heroes[hi].loc, -1)));
    const syms = d.syms as Sym[];
    return syms.length * 1.5 + (d.special ? 1 : 0) + Math.min(here, 4) + (syms.includes('move') ? around * 0.3 : 0);
  };
  return [...hand].sort((a, b) => score(b) - score(a))[0];
}

export interface BotResult {
  state: GameState;
  turns: number;
}

export async function playGame(opts: E.NewGameOpts, uiSeed = 1): Promise<BotResult> {
  E.setUI(botUI(uiSeed));
  await E.startGame(opts);
  const G = E.g();
  let turns = 0;
  while (!G.gameOver && turns < 400) {
    if (G.phase !== 'hero' || G.turn) throw new Error(`unexpected phase ${G.phase}`);
    if (!G.hand.length) throw new Error('empty hand at the start of a hero turn');
    await E.playCard(chooseCard().uid);
    await heroActions();
    if (G.gameOver) break;
    await E.endTurn(true);
    turns++;
  }
  if (!G.gameOver) throw new Error('game did not finish in 400 turns');
  return { state: G, turns };
}
