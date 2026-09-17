// scripts.ts — card text as code: Hero Special Effects, Master Plan special
// effects, Threat card hooks and Location End of Turn effects.
//
// Every script is an async function that may prompt through `ui`. Hero specials
// return `false` when the player cancelled (the special stays available).

import { HERO_CARD_BY_ID, LOCATION_BY_ID } from '../data';
import type { Sym } from '../types';
import {
  activeHero,
  addFear,
  addToken,
  addTokens,
  attackTargets,
  cardName,
  damageHero,
  damageThreat,
  damageThug,
  damageVillain,
  drawTo,
  g,
  giveCrisis,
  heroName,
  heroesAt,
  isAdjacent,
  locName,
  log,
  N_LOCS,
  newCtx,
  nextLoc,
  removeCivilian,
  removeThug,
  replacePlayedCard,
  shuffle,
  teleport,
  threatDef,
  ui,
  villainDamageable,
} from './game';

const allLocs = () => Array.from({ length: N_LOCS }, (_, i) => i);
const otherLocs = (loc: number) => allLocs().filter(i => i !== loc);
const adjacentLocs = (loc: number) => allLocs().filter(i => isAdjacent(loc, i));

/* ═══════════════ Hero Special Effects ═══════════════ */

// A single "attack action" at a Location, chosen by the player (used by Grow/Photon Blast style
// effects that resolve right away). Returns false if there was nothing to hit.
async function pickTargetAt(loc: number, title: string, targets = attackTargets(loc)) {
  if (!targets.length) return null;
  const label = (k: string) =>
    k === 'thug'
      ? 'a Thug'
      : k === 'threat'
        ? threatDef(loc)?.name ?? 'the Henchman'
        : k === 'villain'
          ? g().villain
          : 'a Crisis token';
  if (targets.length === 1) return targets[0];
  return ui.choose(title, `Choose a target at ${locName(loc)}.`, targets.map(t => ({ label: label(t.kind), value: t })));
}

export const heroSpecials: Record<string, () => Promise<boolean | void>> = {
  async adv_combat_analysis() {
    addTokens('attack', 2);
  },
  async stark_resources() {
    addTokens('move', 2);
  },
  async draw_to_3() {
    drawTo(3);
  },
  async leadership() {
    addTokens('wild', 1);
  },
  async interrogate() {
    const top = g().masterPlanDeck[0];
    if (!top) {
      log('The Master Plan deck is empty.');
      return;
    }
    await ui.showCard('Interrogate — top card of the Master Plan deck', top);
    const r = await ui.choose('Interrogate', 'Place this card on the bottom of the Master Plan deck?', [
      { label: 'Leave it on top', value: false },
      { label: 'Put it on the bottom', value: true },
    ]);
    if (r) {
      g().masterPlanDeck.shift();
      g().masterPlanDeck.push(top);
      log('Interrogate: the top Master Plan card was placed on the bottom.', 'good');
    } else log('Interrogate: the top Master Plan card stays on top.');
  },
  async hulk_smash() {
    const t = g().turn!;
    const me = t.heroIdx;
    const loc = g().heroes[me].loc;
    const L = g().locations[loc];
    log(`HULK SMASH! at ${locName(loc)}.`, 'hero');
    for (const i of heroesAt(loc)) if (i !== me) await damageHero(i, 1, 'Hulk Smash!');
    // every Thug takes 1 damage
    const n = L.thugs;
    if (threatDef(loc)?.key === 'elite_thugs') {
      const dead = L.wounded;
      for (let k = 0; k < dead; k++) {
        L.wounded--;
        removeThug(loc);
      }
      L.wounded = L.thugs; // the rest are now wounded
    } else for (let k = 0; k < n; k++) removeThug(loc);
    if (threatDef(loc)?.kind === 'henchman') damageThreat(loc, 1);
    if (g().villainLoc === loc) {
      if (villainDamageable()) damageVillain(1);
      else log(`${g().villain} cannot be damaged yet.`);
    }
    const c = L.civilians;
    for (let k = 0; k < c; k++) removeCivilian(loc, false);
  },
  async photon_blast() {
    const h = activeHero()!;
    const cands = adjacentLocs(h.loc);
    const loc = await ui.pickLocation('Photon Blast — choose an adjacent Location', cands, 'Cancel');
    if (loc === null) return false;
    g().turn!.remote = { loc, n: 2 };
    log(`Photon Blast: 2 attacks available at ${locName(loc)}.`, 'good');
  },
  async grow() {
    const t = g().turn!;
    const h = activeHero()!;
    const loc = await ui.pickLocation('Grow — move to an adjacent Location', adjacentLocs(h.loc), 'Cancel');
    if (loc === null) return false;
    teleport(t.heroIdx, loc);
    const target = await pickTargetAt(loc, 'Grow — 3 damage against a single target');
    if (!target) {
      log('Grow: nothing to smash here.');
      return;
    }
    if (target.kind === 'thug') damageThug(loc, 3);
    else if (target.kind === 'threat') damageThreat(loc, 3);
    else if (target.kind === 'villain') damageVillain(3);
    else if (target.kind === 'crisis') log('Grow cannot remove a Crisis token (that needs an action).');
  },
  async quantum_leap() {
    const t = g().turn!;
    const S = g().storyline;
    const mine = S.filter(
      (e): e is Extract<typeof e, { kind: 'hero' }> =>
        e.kind === 'hero' && e.hero === g().heroes[t.heroIdx].id && e.uid !== t.playedUid
    );
    if (!mine.length) {
      log('Quantum Leap: no other Ant-Man card in the Storyline.');
      return false;
    }
    const picked = await ui.pickCards(
      mine.map(e => ({ uid: e.uid, id: e.id })),
      { title: 'Quantum Leap — swap with one of your cards in the Storyline', min: 1, max: 1, cancel: 'Cancel' }
    );
    if (!picked?.length) return false;
    const target = picked[0];
    const a = S.findIndex(e => e.kind === 'hero' && e.uid === t.playedUid);
    const b = S.findIndex(e => e.kind === 'hero' && e.uid === target.uid);
    [S[a], S[b]] = [S[b], S[a]];
    replacePlayedCard(target.uid, target.id);
    log(`Quantum Leap: ${cardName(target.id)} is now the card played this turn.`, 'good');
  },
  async shrink() {
    const t = g().turn!;
    g().heroes[t.heroIdx].invulnerable = true;
    log(`${heroName(t.heroIdx)} is Invulnerable until their next activation.`, 'good');
  },
  async wings() {
    const t = g().turn!;
    const h = activeHero()!;
    const to = await ui.pickLocation('Wings — move to any other Location', otherLocs(h.loc), 'Cancel');
    if (to === null) return false;
    const from = h.loc;
    const others = heroesAt(from).filter(i => i !== t.heroIdx);
    const moving = [t.heroIdx];
    for (const i of others) {
      const r = await ui.choose(`Wings`, `Take ${heroName(i)} along to ${locName(to)}?`, [
        { label: `Yes, move ${heroName(i)}`, value: true },
        { label: 'No', value: false },
      ]);
      if (r) moving.push(i);
    }
    for (const i of moving) teleport(i, to);
  },
  async move_anywhere_attack() {
    const t = g().turn!;
    const h = activeHero()!;
    const to = await ui.pickLocation('Move to any Location and attack there', otherLocs(h.loc), 'Cancel');
    if (to === null) return false;
    teleport(t.heroIdx, to);
    t.remote = { loc: to, n: 1 };
    log(`1 attack available at ${locName(to)}.`, 'good');
  },
  async symbiote_enhancement() {
    const t = g().turn!;
    t.pool.move++;
    t.pool.attack++;
    log('Symbiote Enhancement: +1 move, +1 attack this turn.', 'good');
  },
};

/* ═══════════════ Master Plan special effects ═══════════════ */

export const planSpecials: Record<string, () => Promise<void>> = {
  async hail_hydra() {
    let fear = 0;
    for (let d = 0; d < N_LOCS; d++) {
      const loc = nextLoc(g().villainLoc, d);
      const L = g().locations[loc];
      const hs = heroesAt(loc);
      if (!hs.length || L.civilians <= 0) continue;
      for (const i of hs) await damageHero(i, 1, 'Hail Hydra!');
      const c = L.civilians;
      for (let k = 0; k < c; k++) removeCivilian(loc, false);
      fear += c;
    }
    if (fear) addFear(fear, 'Hail Hydra!');
    else log('Hail Hydra!: no Heroes share a Location with Civilians.');
  },
  async hydra_insurgency() {
    const n = g().heroes.reduce((s, h) => s + (h.ko ? 0 : h.crisis), 0);
    if (n) addFear(n, 'Hydra Insurgency');
    else log('Hydra Insurgency: the Heroes have no Crisis tokens.');
  },
  async encephalo_ray() {
    for (let i = 0; i < g().heroes.length; i++) {
      const h = g().heroes[i];
      if (h.crisis > 0) await damageHero(i, h.crisis, 'Encephalo-Ray');
      if (g().gameOver) return;
    }
    const cands = g().heroes.map((h, i) => (h.ko ? -1 : i)).filter(i => i >= 0);
    const i = await ui.pickHero('Encephalo-Ray — choose a Hero to take 1 Crisis token', cands);
    if (i !== null) giveCrisis(i, 1);
  },
  async mesmerize() {
    const v = g().villainLoc;
    const near = [nextLoc(v, -1), v, nextLoc(v, 1)];
    for (const loc of near) for (const i of heroesAt(loc)) giveCrisis(i, 1);
    const ctx = newCtx();
    for (const loc of allLocs()) if (!heroesAt(loc).length) addToken(loc, 'thug', ctx);
  },
  async copycat_attack() {
    const n = lastTwoHeroSyms().filter(s => s === 'attack').length;
    log(`Copycat: ${n} attack symbol${n === 1 ? '' : 's'} on the last 2 Hero cards.`);
    const ctx = newCtx();
    for (let k = 0; k < n; k++) addToken(g().villainLoc, 'thug', ctx);
  },
  async copycat_heroic() {
    const n = lastTwoHeroSyms().filter(s => s === 'heroic').length;
    log(`Copycat: ${n} heroic symbol${n === 1 ? '' : 's'} on the last 2 Hero cards.`);
    const ctx = newCtx();
    for (let k = 0; k < n; k++) addToken(g().villainLoc, 'civilian', ctx);
  },
  async dark_schemes() {
    const v = g().villainLoc;
    if (!heroesAt(v).length) {
      g().locations[v].crisis++;
      log(`Dark Schemes: Crisis token added to ${locName(v)} (now ${g().locations[v].crisis}).`, 'bad');
    } else log('Dark Schemes: Heroes are present — nothing happens.');
  },
};

function lastTwoHeroSyms(): Sym[] {
  const heroCards = g().storyline.filter(e => e.kind === 'hero');
  return heroCards
    .slice(-2)
    .flatMap(e => (e.kind === 'hero' ? HERO_CARD_BY_ID[e.id].syms : []));
}

/* ═══════════════ Threat hooks ═══════════════ */

// ↻ effects — the Villain ended their movement here.
export const threatEnter: Record<string, (loc: number) => Promise<void>> = {
  async subversion(loc) {
    const L = g().locations[loc];
    const n = L.thugs + L.civilians;
    for (let k = L.thugs; k > 0; k--) removeThug(loc, true);
    for (let k = L.civilians; k > 0; k--) removeCivilian(loc, false);
    if (n) addFear(n, 'Subversion');
    else log('Subversion: no tokens to discard.');
  },
  async brainwashing(loc) {
    for (const l of [nextLoc(loc, -1), loc, nextLoc(loc, 1)]) for (const i of heroesAt(l)) giveCrisis(i, 1);
  },
  async duplication(loc) {
    addToken(loc, 'thug');
  },
};

// BAM! effects on Threat cards.
export const threatBam: Record<string, (loc: number) => Promise<void>> = {
  async madame_hydra(loc) {
    await preventableBam(loc, 1, 1, 'Madame Hydra');
  },
  async crossbones(loc) {
    await preventableBam(loc, 2, 2, 'Crossbones');
  },
  async ultron_clone(loc) {
    const hs = heroesAt(loc);
    if (hs.length) {
      const r = await ui.choose(
        'Ultron Clone — BAM!',
        `Add a Thug to ${locName(loc)} — or prevent it if each Hero there (${hs
          .map(heroName)
          .join(', ')}) takes 1 damage.`,
        [
          { label: 'Let the Thug be added', value: false },
          { label: 'Prevent: each Hero here takes 1 damage', value: true, danger: true },
        ]
      );
      if (r) {
        for (const i of hs) await damageHero(i, 1, 'Ultron Clone');
        return;
      }
    }
    addToken(loc, 'thug');
  },
};

// "Deal N damage to each Hero in this Location. Any Hero can prevent this effect by taking K Crisis tokens."
async function preventableBam(loc: number, dmg: number, crisis: number, name: string) {
  const hs = heroesAt(loc);
  if (!hs.length) {
    log(`${name}: no Heroes here.`);
    return;
  }
  const alive = g().heroes.map((h, i) => (h.ko ? -1 : i)).filter(i => i >= 0);
  const opts = [
    { label: `Take the damage (${hs.map(heroName).join(', ')}: ${dmg} each)`, value: -1, danger: true },
    ...alive.map(i => ({ label: `${heroName(i)} takes ${crisis} Crisis token${crisis > 1 ? 's' : ''} to prevent it`, value: i })),
  ];
  const r = await ui.choose(`${name} — BAM!`, `Deal ${dmg} damage to each Hero at ${locName(loc)}. Any Hero can prevent this.`, opts);
  if (r !== null && r >= 0) {
    giveCrisis(r, crisis);
    log(`${name}'s BAM! is prevented.`, 'good');
    return;
  }
  for (const i of hs) await damageHero(i, dmg, name);
}

/* ═══════════════ Location End of Turn effects ═══════════════ */

export const locationEffects: Record<string, () => Promise<void>> = {
  async swap_storyline() {
    const t = g().turn!;
    const hero = g().heroes[t.heroIdx].id;
    const mine = g().storyline.filter(
      (e): e is Extract<typeof e, { kind: 'hero' }> => e.kind === 'hero' && e.hero === hero
    );
    if (!g().hand.length || !mine.length) {
      log('Stark Labs: nothing to swap.');
      return;
    }
    const fromHand = await ui.pickCards(g().hand, { title: 'Stark Labs — choose a card from your hand', min: 1, max: 1, cancel: 'Cancel' });
    if (!fromHand?.length) return;
    const fromStory = await ui.pickCards(
      mine.map(e => ({ uid: e.uid, id: e.id })),
      { title: 'Stark Labs — swap it with one of your cards in the Storyline', min: 1, max: 1, cancel: 'Cancel' }
    );
    if (!fromStory?.length) return;
    const hc = fromHand[0];
    const sc = fromStory[0];
    const si = g().storyline.findIndex(e => e.kind === 'hero' && e.uid === sc.uid);
    const hi = g().hand.findIndex(c => c.uid === hc.uid);
    g().storyline[si] = { kind: 'hero', uid: hc.uid, id: hc.id, hero };
    g().hand[hi] = { uid: sc.uid, id: sc.id };
    if (t.playedUid === sc.uid) {
      t.playedUid = hc.uid;
      t.playedId = hc.id;
    }
    log(`Stark Labs: swapped ${cardName(hc.id)} (hand) with ${cardName(sc.id)} (Storyline).`, 'good');
  },
  async draw_to_3() {
    drawTo(3);
  },
  async discard_thug_anywhere() {
    const cands = allLocs().filter(i => g().locations[i].thugs > 0);
    if (!cands.length) return log('No Thugs anywhere.');
    const loc = await ui.pickLocation('NYPD — discard 1 Thug from any Location', cands, 'Skip');
    if (loc !== null) removeThug(loc, true);
  },
  async rescue_here() {
    const h = activeHero()!;
    if (g().locations[h.loc].civilians > 0) removeCivilian(h.loc, true);
    else log('Times Square: no Civilians here.');
  },
  async tutor_top() {
    const deck = g().deck;
    if (!deck.length) return log('The deck is empty.');
    const sorted = [...deck].sort((a, b) => a.id.localeCompare(b.id));
    const picked = await ui.pickCards(sorted, { title: 'Avengers Tower — choose a card to put on top of your deck', min: 1, max: 1, cancel: 'Skip' });
    if (!picked?.length) return;
    const i = deck.findIndex(c => c.uid === picked[0].uid);
    const [c] = deck.splice(i, 1);
    shuffle(deck);
    deck.unshift(c);
    log(`Avengers Tower: ${cardName(c.id)} is on top of the deck.`, 'good');
  },
  async move_anywhere() {
    const t = g().turn!;
    const h = activeHero()!;
    const to = await ui.pickLocation('Helicarrier — move to any other Location', otherLocs(h.loc), 'Skip');
    if (to !== null) teleport(t.heroIdx, to);
  },
  async relocate_tokens() {
    const h = activeHero()!;
    const from = h.loc;
    for (let k = 0; k < 2; k++) {
      const L = g().locations[from];
      const opts: { label: string; value: 'thug' | 'civilian' }[] = [];
      if (L.thugs > 0) opts.push({ label: 'a Thug', value: 'thug' });
      if (L.civilians > 0) opts.push({ label: 'a Civilian', value: 'civilian' });
      if (!opts.length) break;
      const kind = await ui.choose('Central Park', `Move a token from ${locName(from)} (${2 - k} left)?`, opts, 'Done');
      if (kind === null) break;
      const cands = otherLocs(from).filter(i => {
        const D = g().locations[i];
        return D.thugs + D.civilians < LOCATION_BY_ID[D.id].slots;
      });
      if (!cands.length) {
        log('No Location has room.');
        break;
      }
      const to = await ui.pickLocation(`Central Park — move the ${kind} where?`, cands, 'Cancel');
      if (to === null) break;
      if (kind === 'thug') {
        L.thugs--;
        g().locations[to].thugs++;
      } else {
        L.civilians--;
        g().locations[to].civilians++;
      }
      log(`Central Park: ${kind} moved to ${locName(to)}.`, 'good');
    }
  },
  async discard_for_crisis() {
    const sources: { label: string; value: { hero?: number; loc?: number } }[] = [];
    g().heroes.forEach((h, i) => {
      if (h.crisis > 0 && !h.ko) sources.push({ label: `${heroName(i)} (${h.crisis})`, value: { hero: i } });
    });
    g().locations.forEach((L, i) => {
      if (L.crisis > 0) sources.push({ label: `${locName(i)} (${L.crisis})`, value: { loc: i } });
    });
    if (!sources.length) return log('No Crisis tokens anywhere.');
    if (!g().hand.length) return log('No card to discard.');
    const picked = await ui.pickCards(g().hand, { title: 'S.H.I.E.L.D. HQ — discard a card to the bottom of your deck', min: 1, max: 1, cancel: 'Skip' });
    if (!picked?.length) return;
    const src = await ui.choose('S.H.I.E.L.D. HQ', 'Remove 1 Crisis token from…', sources, 'Cancel');
    if (src === null) return;
    const c = picked[0];
    g().hand.splice(g().hand.findIndex(x => x.uid === c.uid), 1);
    g().deck.push(c);
    if (src.hero !== undefined) {
      g().heroes[src.hero].crisis--;
      log(`Crisis token removed from ${heroName(src.hero)}.`, 'good');
    } else if (src.loc !== undefined) {
      g().locations[src.loc].crisis--;
      log(`Crisis token removed from ${locName(src.loc)}.`, 'good');
    }
  },
};
