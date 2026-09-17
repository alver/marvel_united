// game.ts — the Marvel United S.H.I.E.L.D. (solo) engine.
//
// The whole game state lives in one JSON-serializable object G (read via getG()).
// All player prompts go through the injected UIPort (setUI). The React UI and the
// headless test bot are two implementations of the same seam.

import type {
  CardInst,
  ChoiceOption,
  GameOptions,
  GameState,
  HeroId,
  HeroState,
  LocationState,
  MissionKey,
  Sym,
  Target,
  ThreatDef,
  TurnState,
  UIPort,
  VillainId,
} from '../types';
import { SYMS } from '../types';
import {
  HERO_BY_ID,
  HERO_CARD_BY_ID,
  LOCATIONS,
  LOCATION_BY_ID,
  MISSION_NAME,
  MISSION_SIZE,
  PLAN_BY_ID,
  SOLO_HAND,
  SOLO_HEROES,
  THREAT_BY_ID,
  VILLAIN_BY_ID,
} from '../data';
import { nextRandom, randomSeed, seedToState } from './rng';
import { heroSpecials, locationEffects, planSpecials, threatBam, threatEnter } from './scripts';

/* ─────────── module state ─────────── */

let G: GameState | null = null;

// A UI that answers every prompt with the first option — used until setUI() is called.
const autoUI: UIPort = {
  async choose(_t, _p, options) {
    return options.length ? options[0].value : null;
  },
  async pickCards(cards, opts) {
    return cards.slice(0, Math.max(opts.min, Math.min(opts.max, 1)));
  },
  async pickLocation(_t, c) {
    return c.length ? c[0] : null;
  },
  async pickHero(_t, c) {
    return c.length ? c[0] : null;
  },
  async showCard() {},
  render() {},
};
let UI: UIPort = autoUI;

export function setUI(ui: UIPort) {
  UI = ui;
}
export function getG(): GameState | null {
  return G;
}
export function g(): GameState {
  if (!G) throw new Error('no game');
  return G;
}
export function snapshot(): string {
  return JSON.stringify(G);
}
export function restore(s: string) {
  G = JSON.parse(s) as GameState;
}
export function render() {
  UI.render();
}

export function log(msg: string, cls = '') {
  if (!G) return;
  G.log.push({ msg, cls, turn: G.turnNo });
  if (G.log.length > 400) G.log.shift();
}

/* ─────────── randomness ─────────── */

function rand(): number {
  const [s, r] = nextRandom(g().rng);
  g().rng = s;
  return r;
}
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────── small helpers ─────────── */

export const N_LOCS = 6;
export function nextLoc(i: number, d = 1): number {
  return (((i + d) % N_LOCS) + N_LOCS) % N_LOCS;
}
export function isAdjacent(a: number, b: number): boolean {
  return nextLoc(a, 1) === b || nextLoc(a, -1) === b;
}
export function heroName(idx: number): string {
  return HERO_BY_ID[g().heroes[idx].id].name;
}
export function heroesAt(loc: number): number[] {
  return g()
    .heroes.map((h, i) => (h.loc === loc && !h.ko ? i : -1))
    .filter(i => i >= 0);
}
export function locName(loc: number): string {
  return LOCATION_BY_ID[g().locations[loc].id].name;
}
export function threatDef(loc: number): ThreatDef | null {
  const t = g().locations[loc].threat;
  return t ? THREAT_BY_ID[t.id] : null;
}
export function threatKey(loc: number): string | null {
  return threatDef(loc)?.key ?? null;
}
function freeSlots(l: LocationState): number {
  return LOCATION_BY_ID[l.id].slots - l.civilians - l.thugs;
}
export function villainDef() {
  return VILLAIN_BY_ID[g().villain];
}
export function activeHero(): HeroState | null {
  const t = g().turn;
  return t ? g().heroes[t.heroIdx] : null;
}
export function planEvery(): number {
  return g().missions.done.length >= 1 ? 2 : 3;
}
export function isVulnerable(): boolean {
  return g().missions.done.length >= 2;
}
// Can the Villain take damage right now? (2 Missions + Taskmaster's Crisis rule)
export function villainDamageable(): boolean {
  if (!isVulnerable()) return false;
  if (g().villain === 'taskmaster' && g().locations.some(l => l.crisis > 0)) return false;
  return true;
}

/* ─────────── game over ─────────── */

export function lose(title: string, sub: string) {
  if (g().gameOver) return;
  g().gameOver = { win: false, title, sub };
  g().phase = 'gameover';
  log(`💀 ${title} — ${sub}`, 'lose');
}
export function win(sub: string) {
  if (g().gameOver) return;
  g().gameOver = { win: true, title: 'Heroes win!', sub };
  g().phase = 'gameover';
  log(`🏆 Heroes win! ${sub}`, 'win');
}
function over(): boolean {
  return !!g().gameOver;
}

/* ─────────── setup ─────────── */

export interface NewGameOpts {
  villain: VillainId;
  heroes: HeroId[];
  challenge?: GameOptions['challenge'];
  seed?: string;
  koLimit?: number;
}

export function buildHeroDeck(heroes: HeroId[], challenge: GameOptions['challenge']): string[] {
  const ids: string[] = [];
  for (const hid of heroes) {
    const cards = [...HERO_BY_ID[hid].cards];
    const removeOne = (pred: (syms: Sym[]) => boolean) => {
      const i = cards.findIndex(c => pred(c.syms) && !c.special);
      if (i >= 0) cards.splice(i, 1);
    };
    if (challenge === 'moderate' || challenge === 'heroic')
      removeOne(s => s.length === 1 && s[0] === 'wild');
    if (challenge === 'hard' || challenge === 'heroic')
      removeOne(s => s.length === 2 && s[0] === 'wild' && s[1] === 'wild');
    ids.push(...cards.map(c => c.id));
  }
  return ids;
}

export function newGame(opts: NewGameOpts): GameState {
  const seed = opts.seed || randomSeed();
  const challenge = opts.challenge ?? 'none';
  const koLimit = opts.koLimit ?? 0;
  if (opts.heroes.length !== SOLO_HEROES) throw new Error('solo mode needs 3 heroes');
  const V = VILLAIN_BY_ID[opts.villain];
  G = {
    options: { challenge, seed, koLimit },
    rng: seedToState(seed),
    villain: opts.villain,
    heroes: [],
    locations: [],
    villainLoc: 0,
    villainHealth: V.health[3],
    track: 0,
    masterPlanDeck: [],
    storyline: [],
    deck: [],
    hand: [],
    tokens: { move: 0, attack: 0, heroic: 0, wild: 0 },
    missions: { thugs: 0, civilians: 0, threats: 0, done: [] },
    heroCardsSincePlan: 0,
    koCount: 0,
    phase: 'setup',
    turn: null,
    turnNo: 0,
    nextUid: 1,
    log: [],
    gameOver: null,
  };
  // 6 random Locations around the Mission Guide
  const locs = shuffle([...LOCATIONS]).slice(0, N_LOCS);
  G.locations = locs.map(l => ({
    id: l.id,
    civilians: l.startCivilians,
    thugs: l.startThugs,
    crisis: 0,
    threat: null,
    wounded: 0,
  }));
  // one Threat per Location
  const threats = shuffle([...V.threats]);
  G.locations.forEach((l, i) => {
    const t = threats[i];
    l.threat = { id: t.id, health: t.health ?? 0, heroic: 0 };
  });
  // Master Plan deck, Villain placement, Heroes opposite
  G.masterPlanDeck = shuffle(V.masterPlan.map(c => c.id));
  G.villainLoc = Math.floor(rand() * N_LOCS);
  const heroLoc = nextLoc(G.villainLoc, 3);
  G.heroes = opts.heroes.map(id => ({ id, loc: heroLoc, crisis: 0, invulnerable: false, ko: false }));
  // the shared S.H.I.E.L.D. deck
  const ids = shuffle(buildHeroDeck(opts.heroes, challenge));
  G.deck = ids.map(id => ({ uid: G!.nextUid++, id }));
  log(
    `Setup: ${V.name} vs ${opts.heroes.map(h => HERO_BY_ID[h].name).join(', ')} (seed ${seed}${
      challenge !== 'none' ? ', ' + challenge + ' challenge' : ''
    }).`,
    'sys'
  );
  draw(SOLO_HAND);
  return G;
}

// Create the game, run the opening Villain turn and start the first Hero turn.
export async function startGame(opts: NewGameOpts): Promise<void> {
  newGame(opts);
  render();
  await villainTurn();
  if (!over()) await beginHeroTurn();
  render();
}

/* ─────────── cards & hand ─────────── */

export function draw(n: number): number {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    const c = g().deck.shift();
    if (!c) break;
    g().hand.push(c);
    drawn++;
  }
  if (drawn) log(`Drew ${drawn} card${drawn > 1 ? 's' : ''}.`);
  return drawn;
}
export function drawTo(n: number) {
  const need = n - g().hand.length;
  if (need > 0) draw(need);
  else log('Hand already full — nothing drawn.');
}
export function cardName(id: string): string {
  const c = HERO_CARD_BY_ID[id];
  return `${HERO_BY_ID[c.hero].name}${c.special ? ' · ' + c.special.name : ''}`;
}

// Discard a chosen card from hand to the bottom of the deck (Hero damage / costs).
async function discardFromHand(title: string): Promise<boolean> {
  const hand = g().hand;
  if (!hand.length) return false;
  const picked = await UI.pickCards(hand, { title, min: 1, max: 1 });
  const c = picked?.[0] ?? hand[0];
  const i = hand.findIndex(x => x.uid === c.uid);
  hand.splice(i, 1);
  g().deck.push(c);
  log(`Discarded ${cardName(c.id)} to the bottom of the deck.`);
  return true;
}

/* ─────────── heroes: damage, KO, crisis ─────────── */

export async function damageHero(idx: number, n: number, why: string) {
  const h = g().heroes[idx];
  if (n <= 0 || h.ko) return;
  if (h.invulnerable) {
    log(`${heroName(idx)} is Invulnerable — ignores ${n} damage (${why}).`, 'good');
    return;
  }
  for (let i = 0; i < n; i++) {
    if (over()) return;
    log(`${heroName(idx)} takes 1 damage (${why}).`, 'bad');
    if (!g().hand.length) {
      await koHero(idx, 'took damage with no cards in hand');
      return;
    }
    await discardFromHand(`${heroName(idx)} takes 1 damage (${why}) — discard a card`);
    if (!g().hand.length) {
      await koHero(idx, 'discarded the last card in hand');
      return;
    }
  }
}

export async function koHero(idx: number, why: string) {
  const h = g().heroes[idx];
  if (h.ko) return;
  g().koCount++;
  if (g().koCount > g().options.koLimit) {
    lose(`${heroName(idx)} is KO'd`, `S.H.I.E.L.D. is KO'd (${why}) — in solo mode that is the end.`);
    return;
  }
  h.ko = true;
  log(`${heroName(idx)} is KO'd (${why})! The Villain's BAM! triggers.`, 'bad');
  await villainBam();
}

export function giveCrisis(idx: number, n = 1) {
  const h = g().heroes[idx];
  if (h.ko) return;
  h.crisis += n;
  log(`${heroName(idx)} takes ${n} Crisis token${n > 1 ? 's' : ''} (now ${h.crisis}).`, 'bad');
}

/* ─────────── Villain track / plot ─────────── */

export function addFear(n: number, why: string) {
  if (n <= 0 || g().villain !== 'redskull') return;
  g().track = Math.min(20, g().track + n);
  log(`Fear Track +${n} → ${g().track} (${why}).`, 'bad');
  if (g().track >= 20) lose('Fear grips the city', 'The Fear Track reached 20.');
}

export function checkPlot() {
  if (over()) return;
  if (g().villain === 'ultron' && g().locations.every(l => freeSlots(l) <= 0))
    lose('Ultron prevails', 'Every Location is fully occupied by Thugs and Civilians.');
}

/* ─────────── tokens on Locations ─────────── */

export interface OverflowCtx {
  crisisLocs: number[]; // Taskmaster: one Crisis per Location per effect
}
export function newCtx(): OverflowCtx {
  return { crisisLocs: [] };
}

export function addToken(loc: number, kind: 'thug' | 'civilian', ctx: OverflowCtx = newCtx()) {
  const L = g().locations[loc];
  if (freeSlots(L) > 0) {
    if (kind === 'thug') L.thugs++;
    else L.civilians++;
    log(`${kind === 'thug' ? 'Thug' : 'Civilian'} added to ${locName(loc)}.`);
    checkPlot();
    return;
  }
  // Overflow
  const v = g().villain;
  if (v === 'redskull') {
    log(`Overflow at ${locName(loc)}: ${kind} can't be placed.`, 'bad');
    addFear(1, 'Overflow');
  } else if (v === 'taskmaster') {
    log(`Overflow at ${locName(loc)}: ${kind} can't be placed.`, 'bad');
    if (!ctx.crisisLocs.includes(loc)) {
      ctx.crisisLocs.push(loc);
      L.crisis++;
      log(`Crisis token added to ${locName(loc)} (now ${L.crisis}).`, 'bad');
    }
  } else if (v === 'ultron') {
    for (let d = 1; d < N_LOCS; d++) {
      const j = nextLoc(loc, d);
      if (freeSlots(g().locations[j]) > 0) {
        log(`Overflow at ${locName(loc)}: ${kind} goes to ${locName(j)} instead.`, 'bad');
        addToken(j, kind, ctx);
        return;
      }
    }
    log(`Overflow at ${locName(loc)}: no room anywhere!`, 'bad');
    checkPlot();
  }
}

export function gainMission(key: MissionKey) {
  const M = g().missions;
  if (M.done.includes(key) || M[key] >= MISSION_SIZE[key]) {
    log(`(${MISSION_NAME[key]} is complete — token discarded.)`);
    return;
  }
  M[key]++;
  log(`${MISSION_NAME[key]}: ${M[key]}/${MISSION_SIZE[key]}.`, 'good');
  if (M[key] >= MISSION_SIZE[key]) {
    M.done.push(key);
    const n = M.done.length;
    log(`★ Mission complete: ${MISSION_NAME[key]}!`, 'win');
    if (n === 1) log('The Villain is Under Pressure: a Master Plan card after every 2 Hero cards.', 'sys');
    if (n === 2) log('The Villain is now vulnerable to damage!', 'sys');
    if (n === 3) {
      log('Each Hero draws 1 card.', 'sys');
      draw(SOLO_HEROES);
    }
  }
}

// Thug defeated by damage → Defeat Thugs mission. discard=true → back to the pool.
export function removeThug(loc: number, discard = false) {
  const L = g().locations[loc];
  if (L.thugs <= 0) return;
  L.thugs--;
  if (L.wounded > L.thugs) L.wounded = L.thugs;
  if (discard) log(`Thug discarded from ${locName(loc)}.`);
  else {
    log(`Thug defeated at ${locName(loc)}.`, 'good');
    gainMission('thugs');
  }
}
export function removeCivilian(loc: number, rescue: boolean) {
  const L = g().locations[loc];
  if (L.civilians <= 0) return;
  L.civilians--;
  if (rescue) {
    log(`Civilian rescued at ${locName(loc)}.`, 'good');
    gainMission('civilians');
  } else log(`Civilian discarded from ${locName(loc)}.`);
}

export function clearThreat(loc: number) {
  const L = g().locations[loc];
  if (!L.threat) return;
  const d = THREAT_BY_ID[L.threat.id];
  L.threat = null;
  log(`Threat cleared: ${d.name} at ${locName(loc)}!`, 'good');
  gainMission('threats');
}

export function damageThreat(loc: number, n: number) {
  const L = g().locations[loc];
  const d = threatDef(loc);
  if (!L.threat || !d || d.kind !== 'henchman') return;
  L.threat.health -= n;
  log(`${d.name} takes ${n} damage (${Math.max(0, L.threat.health)} health left).`, 'good');
  if (L.threat.health <= 0) clearThreat(loc);
}

export function damageVillain(n: number) {
  if (!villainDamageable()) return;
  g().villainHealth -= n;
  log(`${villainDef().name} takes ${n} damage (${Math.max(0, g().villainHealth)} health left)!`, 'good');
  if (g().villainHealth <= 0) win(`${villainDef().name} is defeated.`);
}

// "Deal 1 damage to a Thug here" — respects the 2-damage Elite Thugs rule.
export function damageThug(loc: number, dmg = 1) {
  const L = g().locations[loc];
  if (L.thugs <= 0) return;
  const elite = threatKey(loc) === 'elite_thugs';
  if (!elite || dmg >= 2) {
    removeThug(loc);
    return;
  }
  if (L.wounded > 0) {
    L.wounded--;
    removeThug(loc);
  } else {
    L.wounded++;
    log(`A Thug at ${locName(loc)} is wounded (Elite: needs 2 damage this turn).`);
  }
}

/* ─────────── Villain turn ─────────── */

export async function villainBam() {
  if (over()) return;
  const v = g().villain;
  const loc = g().villainLoc;
  log(`💥 BAM! (${villainDef().name})`, 'bam');
  if (v === 'redskull') {
    for (const i of heroesAt(loc)) await damageHero(i, 1, "Red Skull's BAM!");
    addFear(2, 'BAM!');
  } else if (v === 'ultron') {
    const ctx = newCtx();
    for (let k = 0; k < 3; k++) addToken(loc, 'thug', ctx);
    for (const i of heroesAt(loc)) await damageHero(i, 1, "Ultron's BAM!");
  } else if (v === 'taskmaster') {
    for (const i of heroesAt(loc)) await damageHero(i, 1, "Taskmaster's BAM!");
    g().locations[loc].crisis++;
    log(`Crisis token added to ${locName(loc)} (now ${g().locations[loc].crisis}).`, 'bad');
  }
}

async function bamAll() {
  await villainBam();
  // Henchmen BAM!s: clockwise from the Villain's Location
  for (let d = 0; d < N_LOCS; d++) {
    if (over()) return;
    const loc = nextLoc(g().villainLoc, d);
    const def = threatDef(loc);
    if (def?.bam) {
      log(`💥 BAM! ${def.name} (${locName(loc)})`, 'bam');
      await threatBam[def.key](loc);
    }
  }
}

async function addPlanTokens(tokens: { thugs: number; civilians: number }[]) {
  const ctx = newCtx();
  const order = [nextLoc(g().villainLoc, -1), g().villainLoc, nextLoc(g().villainLoc, 1)];
  order.forEach((loc, k) => {
    const t = tokens[k];
    for (let i = 0; i < t.thugs; i++) addToken(loc, 'thug', ctx);
    for (let i = 0; i < t.civilians; i++) addToken(loc, 'civilian', ctx);
  });
}

export async function villainTurn() {
  if (over()) return;
  g().phase = 'villain';
  g().turn = null;
  render();
  const id = g().masterPlanDeck.shift();
  if (!id) {
    lose('The Master Plan is complete', 'The Villain had to draw a Master Plan card but the deck was empty.');
    return;
  }
  const mp = PLAN_BY_ID[id];
  g().storyline.push({ kind: 'plan', id });
  log(`— ${villainDef().name}'s turn: Master Plan card (move ${mp.move}${mp.bam ? ', BAM!' : ''}${
    mp.special ? ', ' + mp.special.name : ''
  }).`, 'villain');
  // 1. Move
  if (mp.move > 0) {
    g().villainLoc = nextLoc(g().villainLoc, mp.move);
    log(`${villainDef().name} moves ${mp.move} to ${locName(g().villainLoc)}.`, 'villain');
  } else log(`${villainDef().name} stays at ${locName(g().villainLoc)}.`, 'villain');
  const enter = threatDef(g().villainLoc);
  if (enter?.onVillainEnter) {
    log(`↻ ${enter.name} triggers.`, 'bam');
    await threatEnter[enter.key](g().villainLoc);
  }
  if (over()) return;
  // 2. BAM!
  if (mp.bam) await bamAll();
  if (over()) return;
  // 3. Thugs / Civilians
  if (mp.tokens) await addPlanTokens(mp.tokens);
  if (over()) return;
  // 4. Special effect
  if (mp.special) {
    log(`${mp.special.name}: ${mp.special.text.replace(/\{(\w+)\}/g, '$1')}`, 'villain');
    await planSpecials[mp.special.key]();
  }
  checkPlot();
  g().heroCardsSincePlan = 0;
  render();
}

/* ─────────── Hero turn ─────────── */

export async function beginHeroTurn() {
  if (over()) return;
  g().phase = 'hero';
  g().turn = null;
  g().turnNo++;
  const koed = g().heroes.filter(h => h.ko);
  if (koed.length) {
    koed.forEach(h => (h.ko = false));
    log(`KO'd Heroes stand back up. Draw up to 4 cards.`, 'sys');
    drawTo(4);
  } else {
    if (!g().deck.length && !g().hand.length) {
      lose('Out of cards', 'A Hero started their turn with no cards in deck or hand.');
      return;
    }
    if (g().deck.length) draw(1);
    else log('The deck is empty — no card drawn.', 'bad');
  }
  render();
}

function symCounts(syms: Sym[]): Record<Sym, number> {
  const r: Record<Sym, number> = { move: 0, attack: 0, heroic: 0, wild: 0 };
  for (const s of syms) r[s]++;
  return r;
}
function prevHeroSyms(): Sym[] {
  const S = g().storyline;
  for (let i = S.length - 1; i >= 0; i--) {
    const e = S[i];
    if (e.kind === 'hero') return HERO_CARD_BY_ID[e.id].syms;
  }
  return [];
}

// 2. Play a card: the card's Hero becomes the active Hero.
export async function playCard(uid: number) {
  if (g().phase !== 'hero' || g().turn) return;
  const i = g().hand.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const [card] = g().hand.splice(i, 1);
  const def = HERO_CARD_BY_ID[card.id];
  const heroIdx = g().heroes.findIndex(h => h.id === def.hero);
  const prev = prevHeroSyms();
  g().storyline.push({ kind: 'hero', uid: card.uid, id: card.id, hero: def.hero });
  const pool = symCounts([...def.syms, ...prev]);
  g().turn = {
    heroIdx,
    playedUid: card.uid,
    playedId: card.id,
    prevSyms: prev,
    pool,
    used: { move: 0, attack: 0, heroic: 0, wild: 0 },
    specialUsed: false,
    locationEffectUsed: false,
    remote: null,
  };
  const h = g().heroes[heroIdx];
  h.invulnerable = false;
  log(`— ${heroName(heroIdx)} plays ${cardName(card.id)} [${def.syms.join(' ') || 'no symbols'}]${
    prev.length ? ` + previous [${prev.join(' ')}]` : ''
  }.`, 'hero');
  render();
  // "Heroes starting their turn in this Location…"
  const key = threatKey(h.loc);
  if (key === 'bob') {
    log('Bob, Agent of Hydra: the Hero takes 1 Crisis token.', 'bad');
    giveCrisis(heroIdx, 1);
  }
  if (key === 'ultron_virus') {
    const opts = SYMS.filter(s => pool[s] > 0).map(s => ({ label: s, value: s }));
    if (opts.length) {
      const s = await UI.choose('Ultron Virus', 'You must ignore 1 action symbol of your choice this turn.', opts);
      const sym = s ?? opts[0].value;
      pool[sym]--;
      g().turn!.used[sym]++;
      log(`Ultron Virus: ${sym} symbol ignored.`, 'bad');
    }
  }
  render();
}

/* ─────────── paying for actions ─────────── */

export function available(sym: Sym): number {
  const t = g().turn;
  if (!t) return 0;
  const own = sym === 'wild' ? 0 : t.pool[sym] + g().tokens[sym];
  return own + t.pool.wild + g().tokens.wild;
}
export function canPay(sym: Sym, n = 1): boolean {
  return available(sym) >= n;
}
// Spend expiring resources first: own symbol → wild symbol → own token → wild token.
export function pay(sym: Sym, n = 1): boolean {
  const t = g().turn;
  if (!t || !canPay(sym, n)) return false;
  for (let i = 0; i < n; i++) {
    if (t.pool[sym] > 0) {
      t.pool[sym]--;
      t.used[sym]++;
    } else if (t.pool.wild > 0) {
      t.pool.wild--;
      t.used.wild++;
    } else if (g().tokens[sym] > 0) {
      g().tokens[sym]--;
      log(`Spent a ${sym} token.`);
    } else {
      g().tokens.wild--;
      log('Spent a Wild token.');
    }
  }
  return true;
}
export function addTokens(sym: Sym, n: number) {
  g().tokens[sym] += n;
  log(`Gained ${n} ${sym} token${n > 1 ? 's' : ''}.`, 'good');
}

/* ─────────── Hero actions ─────────── */

export function moveCost(from: number): number {
  return threatKey(from) === 'entangling_trap' ? 2 : 1;
}
export function canMoveTo(to: number): boolean {
  const h = activeHero();
  if (!h || g().phase !== 'hero') return false;
  return isAdjacent(h.loc, to) && canPay('move', moveCost(h.loc));
}
export async function moveHero(to: number) {
  const t = g().turn;
  const h = activeHero();
  if (!t || !h || !canMoveTo(to)) return;
  pay('move', moveCost(h.loc));
  h.loc = to;
  log(`${heroName(t.heroIdx)} moves to ${locName(to)}.`);
  render();
}
// Free relocation used by special effects.
export function teleport(idx: number, to: number) {
  g().heroes[idx].loc = to;
  log(`${heroName(idx)} moves to ${locName(to)}.`);
}

// Valid Attack targets at a Location for the active Hero.
export function attackTargets(loc: number): Target[] {
  const L = g().locations[loc];
  const out: Target[] = [];
  if (L.thugs > 0) out.push({ kind: 'thug', loc });
  if (L.threat && threatDef(loc)?.kind === 'henchman') out.push({ kind: 'threat', loc });
  if (g().villainLoc === loc && villainDamageable()) out.push({ kind: 'villain', loc });
  if (g().villain === 'taskmaster' && L.crisis > 0 && L.thugs === 0 && L.civilians === 0)
    out.push({ kind: 'crisis', loc });
  return out;
}
export function heroicTargets(loc: number): Target[] {
  const L = g().locations[loc];
  const out: Target[] = [];
  if (L.civilians > 0) out.push({ kind: 'civilian', loc });
  if (L.threat && threatDef(loc)?.kind === 'other') out.push({ kind: 'threat', loc });
  if (g().villain === 'taskmaster' && L.crisis > 0 && L.thugs === 0 && L.civilians === 0)
    out.push({ kind: 'crisis', loc });
  return out;
}
export function heroicCost(target: Target): number {
  if (target.kind === 'civilian' && threatKey(target.loc) === 'explosive_trap') return 2;
  return 1;
}

// Where can the active Hero attack right now (own Location, or a remote one)?
function attackReach(loc: number): 'pay' | 'remote' | null {
  const t = g().turn;
  const h = activeHero();
  if (!t || !h) return null;
  if (t.remote && t.remote.loc === loc && t.remote.n > 0) return 'remote';
  if (h.loc === loc && canPay('attack')) return 'pay';
  return null;
}
export function canAttack(target: Target): boolean {
  if (g().phase !== 'hero') return false;
  if (!attackTargets(target.loc).some(x => x.kind === target.kind)) return false;
  return attackReach(target.loc) !== null;
}
export function canHeroic(target: Target): boolean {
  const h = activeHero();
  if (!h || g().phase !== 'hero' || h.loc !== target.loc) return false;
  if (!heroicTargets(target.loc).some(x => x.kind === target.kind)) return false;
  return canPay('heroic', heroicCost(target));
}

function applyAttack(target: Target) {
  const loc = target.loc;
  if (target.kind === 'thug') damageThug(loc);
  else if (target.kind === 'threat') damageThreat(loc, 1);
  else if (target.kind === 'villain') damageVillain(1);
  else if (target.kind === 'crisis') {
    g().locations[loc].crisis--;
    log(`Crisis token discarded from ${locName(loc)}.`, 'good');
  }
}

export async function attack(target: Target) {
  const t = g().turn;
  if (!t || !canAttack(target)) return;
  const reach = attackReach(target.loc);
  if (reach === 'remote' && t.remote) {
    t.remote.n--;
    if (t.remote.n <= 0) t.remote = null;
  } else pay('attack');
  applyAttack(target);
  render();
}

export async function heroic(target: Target) {
  const t = g().turn;
  if (!t || !canHeroic(target)) return;
  pay('heroic', heroicCost(target));
  const loc = target.loc;
  if (target.kind === 'civilian') removeCivilian(loc, true);
  else if (target.kind === 'threat') {
    const L = g().locations[loc];
    if (L.threat) {
      L.threat.heroic++;
      log(`Heroic Action token placed on ${threatDef(loc)!.name} (${L.threat.heroic}/3).`, 'good');
      if (L.threat.heroic >= 3) clearThreat(loc);
    }
  } else if (target.kind === 'crisis') {
    g().locations[loc].crisis--;
    log(`Crisis token discarded from ${locName(loc)}.`, 'good');
  }
  render();
}

export function canUseSpecial(): boolean {
  const t = g().turn;
  if (!t || g().phase !== 'hero' || t.specialUsed) return false;
  return !!HERO_CARD_BY_ID[t.playedId].special;
}
export async function useSpecial() {
  const t = g().turn;
  if (!t || !canUseSpecial()) return;
  const sp = HERO_CARD_BY_ID[t.playedId].special!;
  t.specialUsed = true;
  log(`${heroName(t.heroIdx)} uses ${sp.name}.`, 'hero');
  const ok = await heroSpecials[sp.key]();
  if (ok === false) {
    t.specialUsed = false; // cancelled
    log(`(${sp.name} cancelled.)`);
  }
  render();
}

// Quantum Leap support: the played card changes; recompute what is still available.
export function replacePlayedCard(uid: number, id: string) {
  const t = g().turn!;
  t.playedUid = uid;
  t.playedId = id;
  const total = symCounts([...HERO_CARD_BY_ID[id].syms, ...t.prevSyms]);
  for (const s of SYMS) t.pool[s] = Math.max(0, total[s] - t.used[s]);
  t.specialUsed = !HERO_CARD_BY_ID[id].special;
}

export function locationEffectAvailable(): boolean {
  const t = g().turn;
  const h = activeHero();
  if (!t || !h || t.locationEffectUsed) return false;
  return !g().locations[h.loc].threat;
}

// 4. Location Effect (optional) → next turn / Villain turn.
export async function endTurn(useLocation?: boolean) {
  const t = g().turn;
  const h = activeHero();
  if (!t || !h || g().phase !== 'hero') return;
  if (locationEffectAvailable()) {
    const def = LOCATION_BY_ID[g().locations[h.loc].id].endOfTurn;
    let use = useLocation;
    if (use === undefined) {
      const r = await UI.choose<boolean>(
        `End of Turn — ${locName(h.loc)}`,
        def.text.replace(/\{(\w+)\}/g, '$1'),
        [
          { label: 'Use the Location effect', value: true },
          { label: 'Skip', value: false },
        ]
      );
      use = r === true;
    }
    if (use) {
      t.locationEffectUsed = true;
      log(`${heroName(t.heroIdx)} uses ${locName(h.loc)}'s End of Turn effect.`, 'hero');
      await locationEffects[def.key]();
    }
  }
  if (over()) return render();
  for (const L of g().locations) L.wounded = 0;
  t.remote = null;
  if (!g().hand.length) {
    await koHero(t.heroIdx, 'no cards in hand at the end of the turn');
    if (over()) return render();
  }
  g().heroCardsSincePlan++;
  g().turn = null;
  render();
  if (g().heroCardsSincePlan >= planEvery()) await villainTurn();
  if (!over()) await beginHeroTurn();
  render();
}

/* ─────────── prompts used by scripts ─────────── */

export const ui = {
  choose<T>(title: string, prompt: string, options: ChoiceOption<T>[], cancel?: string) {
    return UI.choose(title, prompt, options, cancel);
  },
  pickCards(cards: CardInst[], opts: { title: string; min: number; max: number; cancel?: string }) {
    return UI.pickCards(cards, opts);
  },
  pickLocation(title: string, candidates: number[], cancel?: string) {
    return UI.pickLocation(title, candidates, cancel);
  },
  pickHero(title: string, candidates: number[], cancel?: string) {
    return UI.pickHero(title, candidates, cancel);
  },
  showCard(title: string, planId: string) {
    return UI.showCard(title, planId);
  },
};

export type { TurnState };
