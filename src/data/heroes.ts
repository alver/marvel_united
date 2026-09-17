// heroes.ts — the Core Set hero decks (12 cards each), transcribed from the printed cards.
//
// Card ids are `<hero>-<nn>`. `syms` are the action symbols at the bottom of the
// card; `special` is the boxed Special Effect (its `key` selects the script in
// src/engine/scripts.ts).

import type { HeroCardDef, HeroDef, HeroId, SpecialDef, Sym } from '../types';

const SPECIALS: Record<string, SpecialDef> = {
  adv_combat_analysis: {
    key: 'adv_combat_analysis',
    name: 'Advanced Combat Analysis',
    text: 'Distribute 2 {attack} tokens from the pool among any number of Heroes.',
  },
  stark_resources: {
    key: 'stark_resources',
    name: 'Stark Resources',
    text: 'Distribute 2 {move} tokens from the pool among any number of Heroes.',
  },
  power_recharge: {
    key: 'draw_to_3',
    name: 'Power Recharge',
    text: 'You may draw cards until you have 3 in your hand.',
  },
  leadership: {
    key: 'leadership',
    name: 'Leadership',
    text: 'Give a {wild} token from the pool to another Hero.',
  },
  interrogate: {
    key: 'interrogate',
    name: 'Interrogate',
    text: 'Look at the top card of the Master Plan deck. You may place it on the bottom.',
  },
  hulk_smash: {
    key: 'hulk_smash',
    name: 'Hulk Smash!',
    text: 'Deal 1 damage to EVERYTHING else in this Location. Discard all {civilian} there.',
  },
  photon_blast: {
    key: 'photon_blast',
    name: 'Photon Blast',
    text: '{attack} {attack} in one adjacent Location.',
  },
  grow: {
    key: 'grow',
    name: 'Grow',
    text: '{move} then {attack} {attack} {attack} against a single target.',
  },
  quantum_leap: {
    key: 'quantum_leap',
    name: 'Quantum Leap',
    text: 'Swap this card with any of your faceup cards in the Storyline. That card becomes the one you played this turn.',
  },
  shrink: {
    key: 'shrink',
    name: 'Shrink',
    text: 'You cannot take any damage until the beginning of your next turn.',
  },
  wings: {
    key: 'wings',
    name: 'Wings',
    text: 'You may move yourself and any number of Heroes from your Location to any other Location.',
  },
  energy_projection: {
    key: 'move_anywhere_attack',
    name: 'Energy Projection',
    text: 'You can move to any Location and {attack} there.',
  },
  tracking: {
    key: 'move_anywhere_attack',
    name: 'Tracking',
    text: 'You can move to any Location and {attack} there.',
  },
  regeneration: {
    key: 'draw_to_3',
    name: 'Regeneration',
    text: 'You may draw cards until you have 3 in your hand.',
  },
  symbiote_enhancement: {
    key: 'symbiote_enhancement',
    name: 'Symbiote Enhancement',
    text: '{move} {attack}',
  },
};

function deck(hero: HeroId, cards: [Sym[], string?][]): HeroCardDef[] {
  return cards.map(([syms, special], i) => {
    const c: HeroCardDef = { id: `${hero}-${String(i + 1).padStart(2, '0')}`, hero, syms };
    if (special) c.special = SPECIALS[special];
    return c;
  });
}

const M: Sym = 'move';
const A: Sym = 'attack';
const H: Sym = 'heroic';
const W: Sym = 'wild';

export const HEROES: HeroDef[] = [
  {
    id: 'ironman',
    name: 'Iron Man',
    realName: 'Anthony Edward Stark',
    color: '#b8312f',
    cards: deck('ironman', [
      [[M]],
      [[M], 'adv_combat_analysis'],
      [[M, H]],
      [[M, A]],
      [[A], 'stark_resources'],
      [[A, A]],
      [[A, A]],
      [[H, H]],
      [[H]],
      [[H], 'power_recharge'],
      [[W, W]],
      [[W]],
    ]),
  },
  {
    id: 'captainamerica',
    name: 'Captain America',
    realName: 'Steve Rogers',
    color: '#2f5f9e',
    cards: deck('captainamerica', [
      [[M]],
      [[M], 'leadership'],
      [[M, A]],
      [[M, A]],
      [[A, A]],
      [[A], 'leadership'],
      [[H, H]],
      [[H, H]],
      [[H, H]],
      [[H], 'leadership'],
      [[W]],
      [[W, W]],
    ]),
  },
  {
    id: 'blackwidow',
    name: 'Black Widow',
    realName: 'Natasha Romanoff',
    color: '#2b2b2f',
    cards: deck('blackwidow', [
      [[M]],
      [[M, H]],
      [[M, A]],
      [[M, H]],
      [[A]],
      [[A], 'interrogate'],
      [[A], 'interrogate'],
      [[A], 'interrogate'],
      [[A, A]],
      [[H, H]],
      [[W]],
      [[W, W]],
    ]),
  },
  {
    id: 'hulk',
    name: 'Hulk',
    realName: 'Bruce Banner',
    color: '#4e7a2a',
    cards: deck('hulk', [
      [[M]],
      [[M], 'hulk_smash'],
      [[M], 'hulk_smash'],
      [[M], 'hulk_smash'],
      [[M, A]],
      [[A, A]],
      [[A, A]],
      [[A, A]],
      [[H]],
      [[H]],
      [[W]],
      [[W, W]],
    ]),
  },
  {
    id: 'captainmarvel',
    name: 'Captain Marvel',
    realName: 'Carol Danvers',
    color: '#c99a2a',
    cards: deck('captainmarvel', [
      [[M]],
      [[M, M]],
      [[M, H]],
      [[A], 'photon_blast'],
      [[A], 'photon_blast'],
      [[A], 'photon_blast'],
      [[A, A]],
      [[A, A]],
      [[H, H]],
      [[W]],
      [[W]],
      [[W, W]],
    ]),
  },
  {
    id: 'antman',
    name: 'Ant-Man',
    realName: 'Scott Lang',
    color: '#7d7f86',
    cards: deck('antman', [
      [[M], 'grow'],
      [[M]],
      [[M, H]],
      [[H, A]],
      [[A]],
      [[], 'quantum_leap'],
      [[H, H]],
      [[H]],
      [[H, H]],
      [[W], 'shrink'],
      [[W]],
      [[W, W]],
    ]),
  },
  {
    id: 'wasp',
    name: 'Wasp',
    realName: 'Janet van Dyne',
    color: '#d1a21c',
    cards: deck('wasp', [
      [[M]],
      [[M], 'wings'],
      [[M, A]],
      [[M, A]],
      [[M, A]],
      [[A], 'energy_projection'],
      [[A]],
      [[H]],
      [[H, H]],
      [[W], 'shrink'],
      [[W]],
      [[W, W]],
    ]),
  },
  {
    id: 'venom',
    name: 'Venom',
    realName: 'Eddie Brock',
    color: '#3a3a44',
    cards: deck('venom', [
      [[A], 'tracking'],
      [[M], 'regeneration'],
      [[A], 'symbiote_enhancement'],
      [[W, W]],
      [[W]],
      [[H, A]],
      [[A, A]],
      [[A]],
      [[M, H]],
      [[M, A]],
      [[M, A]],
      [[M]],
    ]),
  },
];

export const HERO_BY_ID: Record<HeroId, HeroDef> = Object.fromEntries(
  HEROES.map(h => [h.id, h])
) as Record<HeroId, HeroDef>;

export const HERO_CARD_BY_ID: Record<string, HeroCardDef> = Object.fromEntries(
  HEROES.flatMap(h => h.cards).map(c => [c.id, c])
);
