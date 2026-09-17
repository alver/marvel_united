import { beforeEach, describe, expect, it } from 'vitest';
import * as E from '../src/engine/game';
import { LOCATION_BY_ID, MISSION_SIZE } from '../src/data';
import { botUI } from './bot';

function setup(villain: 'redskull' | 'ultron' | 'taskmaster' = 'redskull', seed = 'test-1') {
  E.setUI(botUI(7));
  const G = E.newGame({ villain, heroes: ['ironman', 'captainamerica', 'hulk'], seed });
  return G;
}

// Put the active hero's card into play directly (bypasses the draw step).
async function play(uid: number) {
  await E.playCard(uid);
}

describe('setup', () => {
  it('builds a legal solo setup', () => {
    const G = setup();
    expect(G.locations).toHaveLength(6);
    expect(G.hand).toHaveLength(5);
    expect(G.deck).toHaveLength(31);
    expect(G.villainHealth).toBe(8);
    expect(G.masterPlanDeck).toHaveLength(12);
    for (const L of G.locations) {
      expect(L.threat).not.toBeNull();
      const def = LOCATION_BY_ID[L.id];
      expect(L.civilians).toBe(def.startCivilians);
      expect(L.thugs).toBe(def.startThugs);
    }
    expect(G.heroes.every(h => h.loc === E.nextLoc(G.villainLoc, 3))).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const a = JSON.stringify(setup('ultron', 'abc'));
    const b = JSON.stringify(setup('ultron', 'abc'));
    expect(a).toBe(b);
  });
});

describe('hero turn', () => {
  beforeEach(() => {
    setup();
  });

  it('pools symbols from the played and the previous hero card', async () => {
    const G = E.g();
    G.phase = 'hero';
    // craft the hand: Hulk [attack, attack] then Iron Man [move, heroic]
    G.hand = [{ uid: 900, id: 'hulk-06' }, { uid: 901, id: 'ironman-03' }];
    await play(900);
    expect(G.turn!.pool).toEqual({ move: 0, attack: 2, heroic: 0, wild: 0 });
    await E.endTurn(false);
    expect(G.turn).toBeNull();
    G.phase = 'hero';
    await play(901);
    expect(G.turn!.pool).toEqual({ move: 1, attack: 2, heroic: 1, wild: 0 });
  });

  it('attacks thugs, rescues civilians and fills missions; elite thugs need 2 damage', async () => {
    const G = E.g();
    G.phase = 'hero';
    const h = G.heroes[2];
    const loc = h.loc;
    const L = G.locations[loc];
    L.threat = { id: 'redskull-elite_thugs-1', health: 0, heroic: 0 };
    L.thugs = 2;
    L.civilians = 1;
    G.hand = [{ uid: 900, id: 'hulk-06' }, { uid: 901, id: 'ironman-08' }];
    await play(900); // attack, attack
    await E.attack({ kind: 'thug', loc });
    expect(L.thugs).toBe(2);
    expect(L.wounded).toBe(1);
    await E.attack({ kind: 'thug', loc });
    expect(L.thugs).toBe(1);
    expect(G.missions.thugs).toBe(1);
    expect(E.canPay('attack')).toBe(false);
    await E.endTurn(false);
    G.phase = 'hero';
    await play(901); // heroic, heroic (+ hulk's 2 attacks)
    await E.heroic({ kind: 'civilian', loc });
    expect(G.missions.civilians).toBe(1);
    await E.heroic({ kind: 'threat', loc });
    expect(L.threat!.heroic).toBe(1);
  });

  it('completing missions unlocks pressure, vulnerability and cards', async () => {
    const G = E.g();
    G.phase = 'hero';
    expect(E.planEvery()).toBe(3);
    G.missions.thugs = MISSION_SIZE.thugs - 1;
    E.gainMission('thugs');
    expect(G.missions.done).toEqual(['thugs']);
    expect(E.planEvery()).toBe(2);
    expect(E.isVulnerable()).toBe(false);
    G.missions.threats = MISSION_SIZE.threats - 1;
    E.gainMission('threats');
    expect(E.isVulnerable()).toBe(true);
    const before = G.hand.length;
    G.missions.civilians = MISSION_SIZE.civilians - 1;
    E.gainMission('civilians');
    expect(G.hand.length).toBe(before + 3);
    E.gainMission('civilians'); // discarded, no change
    expect(G.missions.civilians).toBe(MISSION_SIZE.civilians);
  });

  it('wins when the villain is beaten and Taskmaster is shielded by Crisis', async () => {
    const G = setup('taskmaster');
    G.missions.done = ['thugs', 'civilians'];
    G.locations[0].crisis = 1;
    expect(E.villainDamageable()).toBe(false);
    G.locations[0].crisis = 0;
    expect(E.villainDamageable()).toBe(true);
    G.villainHealth = 1;
    E.damageVillain(1);
    expect(G.gameOver?.win).toBe(true);
  });
});

describe('villain turn', () => {
  it('adds tokens around the villain, thugs first, and overflows into Fear for Red Skull', async () => {
    const G = setup('redskull');
    // fill all six locations completely
    for (const L of G.locations) {
      L.thugs = LOCATION_BY_ID[L.id].slots;
      L.civilians = 0;
    }
    G.masterPlanDeck = ['redskull-mp-12']; // move 5, tokens [1/1][2/2][1/1] = 8 tokens
    await E.villainTurn();
    expect(G.track).toBe(8);
    expect(G.storyline[0]).toEqual({ kind: 'plan', id: 'redskull-mp-12' });
  });

  it('Ultron overflow spills clockwise and full board loses', async () => {
    const G = setup('ultron');
    for (const L of G.locations) {
      L.thugs = LOCATION_BY_ID[L.id].slots;
      L.civilians = 0;
    }
    G.locations[E.nextLoc(G.villainLoc, 2)].thugs -= 1; // exactly one free slot, two steps away
    G.masterPlanDeck = ['ultron-mp-07']; // move 1, thugs [1][2][1]
    await E.villainTurn();
    expect(G.gameOver?.win).toBe(false);
    expect(G.locations.every(L => L.thugs + L.civilians >= LOCATION_BY_ID[L.id].slots)).toBe(true);
  });

  it('Taskmaster overflow adds a single Crisis per location', async () => {
    const G = setup('taskmaster');
    for (const L of G.locations) {
      L.thugs = LOCATION_BY_ID[L.id].slots;
      L.civilians = 0;
    }
    G.masterPlanDeck = ['taskmaster-mp-12']; // move 5, [1/1][1/1][1/1]
    await E.villainTurn();
    const v = G.villainLoc;
    expect(G.locations[v].crisis).toBe(1);
    expect(G.locations[E.nextLoc(v, 1)].crisis).toBe(1);
    expect(G.locations[E.nextLoc(v, -1)].crisis).toBe(1);
  });

  it('BAM! damages heroes at the villain location by discarding cards', async () => {
    const G = setup('redskull');
    G.heroes.forEach(h => (h.loc = G.villainLoc));
    const before = G.hand.length;
    G.masterPlanDeck = ['redskull-mp-04']; // move 0, BAM!
    await E.villainTurn();
    expect(G.hand.length).toBe(before - 3);
    expect(G.deck.length).toBe(31 + 3);
    expect(G.track).toBe(2);
  });

  it('loses when the Master Plan deck runs out', async () => {
    const G = setup('redskull');
    G.masterPlanDeck = [];
    await E.villainTurn();
    expect(G.gameOver?.win).toBe(false);
  });
});
