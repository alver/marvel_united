// villains.ts — the three Core Set Villains: dashboard, 12 Master Plan cards, 6 Threat cards.
//
// Master Plan token slots are listed [counter-clockwise neighbour, Villain's Location,
// clockwise neighbour]; they are filled in clockwise order, Thugs before Civilians.

import type { MasterPlanDef, ThreatDef, TokenSlot, VillainDef, VillainId } from '../types';

const T = (thugs: number, civilians = 0): TokenSlot => ({ thugs, civilians });
const C = (civilians: number): TokenSlot => ({ thugs: 0, civilians });
const none: [TokenSlot, TokenSlot, TokenSlot] = [T(0), T(0), T(0)];

interface MP {
  move: number;
  bam?: boolean;
  tokens?: [TokenSlot, TokenSlot, TokenSlot];
  special?: string;
}

function plan(
  villain: VillainId,
  specials: Record<string, { name: string; text: string }>,
  cards: MP[]
): MasterPlanDef[] {
  return cards.map((c, i) => {
    const d: MasterPlanDef = {
      id: `${villain}-mp-${String(i + 1).padStart(2, '0')}`,
      villain,
      move: c.move,
      bam: !!c.bam,
    };
    if (c.tokens && c.tokens !== none) d.tokens = c.tokens;
    if (c.special) d.special = { key: c.special, ...specials[c.special] };
    return d;
  });
}

function threats(villain: VillainId, list: Omit<ThreatDef, 'id' | 'villain'>[]): ThreatDef[] {
  const seen: Record<string, number> = {};
  return list.map(t => {
    seen[t.key] = (seen[t.key] || 0) + 1;
    return { ...t, id: `${villain}-${t.key}-${seen[t.key]}`, villain };
  });
}

export const VILLAINS: VillainDef[] = [
  {
    id: 'redskull',
    name: 'Red Skull',
    realName: 'Johann Schmidt',
    color: '#c8302a',
    health: { 2: 4, 3: 8, 4: 11 },
    bamText: "Deal 1 damage to each Hero in Red Skull's Location and increase the Fear Track by 2.",
    overflowText:
      "If a {civilian} or {thug} token can't be added to a Location, increase the Fear Track by 1 for each token you couldn't add.",
    plotText: 'Fear Track — When this track reaches 20, Heroes lose.',
    track: { name: 'Fear Track', max: 20 },
    masterPlan: plan(
      'redskull',
      {
        hail_hydra: {
          name: 'Hail Hydra!',
          text: 'Discard all {civilian} from Locations with Heroes and deal 1 damage to each of those Heroes. Advance the Fear Track by the number of {civilian} discarded this way.',
        },
        hydra_insurgency: {
          name: 'Hydra Insurgency',
          text: 'For each Crisis token the Heroes have, advance the Fear Track by 1.',
        },
      },
      [
        { move: 0, special: 'hail_hydra' },
        { move: 0, special: 'hail_hydra' },
        { move: 0, bam: true, special: 'hydra_insurgency' },
        { move: 0, bam: true },
        { move: 0, special: 'hydra_insurgency' },
        { move: 1, bam: true, tokens: [C(1), C(2), C(1)] },
        { move: 1, tokens: [T(1), T(2), T(1)] },
        { move: 2, bam: true, tokens: [T(1), T(2), T(1)] },
        { move: 2, bam: true, tokens: [C(1), C(2), C(1)] },
        { move: 3, tokens: [C(1), C(2), C(1)] },
        { move: 4, bam: true, tokens: [T(1), T(2), T(1)] },
        { move: 5, tokens: [T(1, 1), T(2, 2), T(1, 1)] },
      ]
    ),
    threats: threats('redskull', [
      {
        name: 'Subversion',
        key: 'subversion',
        kind: 'other',
        onVillainEnter: true,
        text: 'Discard all {thug} and {civilian} from this Location and advance the Fear Track by the number of tokens discarded this way.',
      },
      {
        name: 'Brainwashing',
        key: 'brainwashing',
        kind: 'other',
        onVillainEnter: true,
        text: 'Heroes in this and adjacent Locations take 1 Crisis token each.',
      },
      {
        name: 'Hydra Elite Troops',
        key: 'elite_thugs',
        kind: 'other',
        text: 'Each {thug} in this Location requires 2 damage to be defeated.',
      },
      {
        name: 'Bob, Agent of Hydra',
        key: 'bob',
        kind: 'henchman',
        health: 4,
        text: 'Heroes starting their turn in this Location take 1 Crisis token.',
      },
      {
        name: 'Madame Hydra',
        key: 'madame_hydra',
        kind: 'henchman',
        health: 5,
        bam: true,
        text: 'BAM! Deal 1 damage to each Hero in this Location. Any Hero can prevent this effect by taking 1 Crisis token.',
      },
      {
        name: 'Crossbones',
        key: 'crossbones',
        kind: 'henchman',
        health: 6,
        bam: true,
        text: 'BAM! Deal 2 damage to each Hero in this Location. Any Hero can prevent this effect by taking 2 Crisis tokens.',
      },
    ]),
  },
  {
    id: 'ultron',
    name: 'Ultron',
    realName: 'Ultron',
    color: '#e07a2b',
    health: { 2: 4, 3: 8, 4: 11 },
    bamText: "Add {thug} {thug} {thug} to Ultron's Location and deal 1 damage to each Hero there.",
    overflowText:
      "If a {civilian} or {thug} token can't be added to a Location, add that token to the next Location clockwise instead.",
    plotText: 'When all Locations are fully occupied by {civilian} or {thug}, the Heroes lose.',
    masterPlan: plan(
      'ultron',
      {
        encephalo_ray: {
          name: 'Encephalo-Ray',
          text: 'Deal 1 damage to each Hero for each Crisis token they have. Then, 1 Hero of your choice takes 1 Crisis token.',
        },
        mesmerize: {
          name: 'Mesmerize',
          text: "Give 1 Crisis token to each Hero in Ultron's Location and adjacent ones. Place {thug} in each Location without Heroes.",
        },
      },
      [
        { move: 0, bam: true },
        { move: 0, special: 'encephalo_ray' },
        { move: 0, special: 'mesmerize' },
        { move: 0, special: 'mesmerize' },
        { move: 0, special: 'encephalo_ray' },
        { move: 1, tokens: [C(1), C(2), C(1)] },
        { move: 1, tokens: [T(1), T(2), T(1)] },
        { move: 2, bam: true },
        { move: 2, bam: true },
        { move: 3, bam: true },
        { move: 4, bam: true },
        { move: 5, tokens: [T(1, 1), T(1), T(1, 1)] },
      ]
    ),
    threats: threats('ultron', [
      {
        name: 'Ultron Virus',
        key: 'ultron_virus',
        kind: 'other',
        text: 'Heroes starting their turn in this Location must ignore 1 action symbol of their choice.',
      },
      {
        name: 'Ultron Virus',
        key: 'ultron_virus',
        kind: 'other',
        text: 'Heroes starting their turn in this Location must ignore 1 action symbol of their choice.',
      },
      {
        name: 'Ultron Clone',
        key: 'ultron_clone',
        kind: 'henchman',
        health: 4,
        bam: true,
        text: 'BAM! Add {thug} to this Location. Heroes in this Location may prevent this effect if each of them takes 1 damage.',
      },
      {
        name: 'Ultron Clone',
        key: 'ultron_clone',
        kind: 'henchman',
        health: 4,
        bam: true,
        text: 'BAM! Add {thug} to this Location. Heroes in this Location may prevent this effect if each of them takes 1 damage.',
      },
      {
        name: 'Duplication',
        key: 'duplication',
        kind: 'other',
        onVillainEnter: true,
        text: 'Add {thug} in this Location.',
      },
      {
        name: 'Duplication',
        key: 'duplication',
        kind: 'other',
        onVillainEnter: true,
        text: 'Add {thug} in this Location.',
      },
    ]),
  },
  {
    id: 'taskmaster',
    name: 'Taskmaster',
    realName: 'Tony Masters',
    color: '#5b6f9e',
    health: { 2: 2, 3: 4, 4: 6 },
    bamText: "Deal 1 damage to each Hero in Taskmaster's Location and add 1 Crisis token there.",
    overflowText:
      "If a {civilian} or {thug} token can't be added to a Location, add a Crisis token to that Location instead.",
    specialRules:
      'Heroes cannot damage Taskmaster as long as there are any Crisis tokens on any Locations. Heroes can discard a Crisis token from a Location with no {civilian} or {thug} tokens by using a {heroic} or {attack} there.',
    masterPlan: plan(
      'taskmaster',
      {
        copycat_attack: {
          name: 'Copycat',
          text: "Add {thug} to Taskmaster's Location for each {attack} at the bottom of the last 2 Hero cards in the Storyline.",
        },
        copycat_heroic: {
          name: 'Copycat',
          text: "Add {civilian} to Taskmaster's Location for each {heroic} at the bottom of the last 2 Hero cards in the Storyline.",
        },
        dark_schemes: {
          name: 'Dark Schemes',
          text: "If there are no Heroes in Taskmaster's Location, place 1 Crisis token there.",
        },
      },
      [
        { move: 0, special: 'copycat_attack' },
        { move: 0, bam: true },
        { move: 0, special: 'dark_schemes' },
        { move: 0, special: 'dark_schemes' },
        { move: 0, special: 'copycat_heroic' },
        { move: 1, bam: true, tokens: [T(1), T(1), T(1)] },
        { move: 1, bam: true, tokens: [C(1), C(1), C(1)] },
        { move: 2, bam: true, tokens: [C(1), C(1), C(1)] },
        { move: 2, bam: true, tokens: [T(1), T(1), T(1)] },
        { move: 3, tokens: [C(1), C(1), C(1)] },
        { move: 4, bam: true, tokens: [T(1), T(1), T(1)] },
        { move: 5, tokens: [T(1, 1), T(1, 1), T(1, 1)] },
      ]
    ),
    threats: threats('taskmaster', [
      {
        name: 'Elite Thugs',
        key: 'elite_thugs',
        kind: 'other',
        text: 'Each {thug} in this Location requires 2 damage to be defeated.',
      },
      {
        name: 'Elite Thugs',
        key: 'elite_thugs',
        kind: 'other',
        text: 'Each {thug} in this Location requires 2 damage to be defeated.',
      },
      {
        name: 'Explosive Trap',
        key: 'explosive_trap',
        kind: 'other',
        text: 'Each {civilian} in this Location requires 1 extra {heroic} to be rescued.',
      },
      {
        name: 'Explosive Trap',
        key: 'explosive_trap',
        kind: 'other',
        text: 'Each {civilian} in this Location requires 1 extra {heroic} to be rescued.',
      },
      {
        name: 'Entangling Trap',
        key: 'entangling_trap',
        kind: 'other',
        text: 'Heroes using {move} to leave this Location must use {move} {move} instead.',
      },
      {
        name: 'Entangling Trap',
        key: 'entangling_trap',
        kind: 'other',
        text: 'Heroes using {move} to leave this Location must use {move} {move} instead.',
      },
    ]),
  },
];

export const VILLAIN_BY_ID: Record<VillainId, VillainDef> = Object.fromEntries(
  VILLAINS.map(v => [v.id, v])
) as Record<VillainId, VillainDef>;

export const PLAN_BY_ID: Record<string, MasterPlanDef> = Object.fromEntries(
  VILLAINS.flatMap(v => v.masterPlan).map(c => [c.id, c])
);

export const THREAT_BY_ID: Record<string, ThreatDef> = Object.fromEntries(
  VILLAINS.flatMap(v => v.threats).map(t => [t.id, t])
);
