import { describe, expect, it } from 'vitest';
import { HEROES, LOCATIONS, VILLAINS } from '../src/data';
import { heroSpecials, locationEffects, planSpecials, threatBam, threatEnter } from '../src/engine/scripts';
import { buildHeroDeck } from '../src/engine/game';

describe('card data invariants', () => {
  it('every hero has 12 cards, one Wild card and one Wild-Wild card', () => {
    for (const h of HEROES) {
      expect(h.cards, h.name).toHaveLength(12);
      const wild = h.cards.filter(c => !c.special && c.syms.length === 1 && c.syms[0] === 'wild');
      const ww = h.cards.filter(c => c.syms.length === 2 && c.syms.every(s => s === 'wild'));
      expect(wild.length, `${h.name} single Wild`).toBeGreaterThanOrEqual(1);
      expect(ww, `${h.name} double Wild`).toHaveLength(1);
      const ids = new Set(h.cards.map(c => c.id));
      expect(ids.size).toBe(12);
    }
  });

  it('every hero special has a script', () => {
    for (const h of HEROES)
      for (const c of h.cards)
        if (c.special) expect(heroSpecials[c.special.key], `${c.id} ${c.special.key}`).toBeTypeOf('function');
  });

  it('every villain has 12 Master Plan cards and 6 Threats with scripts', () => {
    for (const v of VILLAINS) {
      expect(v.masterPlan, v.name).toHaveLength(12);
      expect(v.threats, v.name).toHaveLength(6);
      const moves = v.masterPlan.map(c => c.move).sort((a, b) => a - b);
      expect(moves).toEqual([0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 5]);
      for (const c of v.masterPlan) if (c.special) expect(planSpecials[c.special.key], c.id).toBeTypeOf('function');
      for (const t of v.threats) {
        if (t.bam) expect(threatBam[t.key], t.id).toBeTypeOf('function');
        if (t.onVillainEnter) expect(threatEnter[t.key], t.id).toBeTypeOf('function');
        if (t.kind === 'henchman') expect(t.health, t.id).toBeGreaterThan(0);
      }
      expect(new Set(v.threats.map(t => t.id)).size).toBe(6);
    }
  });

  it('locations have scripts and sane slots', () => {
    expect(LOCATIONS).toHaveLength(8);
    for (const l of LOCATIONS) {
      expect(locationEffects[l.endOfTurn.key], l.id).toBeTypeOf('function');
      expect(l.startCivilians + l.startThugs).toBeLessThan(l.slots);
    }
  });

  it('challenges remove the right cards', () => {
    const base = buildHeroDeck(['ironman', 'hulk', 'wasp'], 'none');
    expect(base).toHaveLength(36);
    expect(buildHeroDeck(['ironman', 'hulk', 'wasp'], 'moderate')).toHaveLength(33);
    expect(buildHeroDeck(['ironman', 'hulk', 'wasp'], 'hard')).toHaveLength(33);
    expect(buildHeroDeck(['ironman', 'hulk', 'wasp'], 'heroic')).toHaveLength(30);
    // Captain Marvel keeps one of her two single-Wild cards on Moderate
    const cm = buildHeroDeck(['captainmarvel', 'hulk', 'wasp'], 'moderate');
    expect(cm.filter(id => id.startsWith('captainmarvel'))).toHaveLength(11);
  });
});
