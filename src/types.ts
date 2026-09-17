// types.ts — shared type definitions for the whole game.
//
// GameState MUST stay plain JSON-serializable data: undo works by
// JSON.stringify/parse snapshots of it (see src/engine/game.ts).

export type Sym = 'move' | 'attack' | 'heroic' | 'wild';
export const SYMS: Sym[] = ['move', 'attack', 'heroic', 'wild'];

export type HeroId =
  | 'ironman'
  | 'captainamerica'
  | 'blackwidow'
  | 'hulk'
  | 'captainmarvel'
  | 'antman'
  | 'wasp'
  | 'venom';

export type VillainId = 'redskull' | 'ultron' | 'taskmaster';

export type LocationId =
  | 'starklabs'
  | 'avengersmansion'
  | 'nypd'
  | 'timessquare'
  | 'avengerstower'
  | 'helicarrier'
  | 'centralpark'
  | 'shieldhq';

export type Challenge = 'none' | 'moderate' | 'hard' | 'heroic';

/* ─────────── card / component definitions (static data) ─────────── */

export interface SpecialDef {
  key: string; // selects the script in engine/scripts.ts
  name: string;
  text: string;
}

export interface HeroCardDef {
  id: string; // e.g. 'ironman-02'
  hero: HeroId;
  syms: Sym[]; // the action symbols at the bottom of the card
  special?: SpecialDef;
}

export interface HeroDef {
  id: HeroId;
  name: string;
  realName: string;
  color: string; // card frame colour
  cards: HeroCardDef[];
}

// Token slots on a Master Plan card: [counter-clockwise neighbour, Villain's location, clockwise neighbour]
export interface TokenSlot {
  thugs: number;
  civilians: number;
}

export interface MasterPlanDef {
  id: string;
  villain: VillainId;
  move: number;
  bam: boolean;
  tokens?: [TokenSlot, TokenSlot, TokenSlot];
  special?: SpecialDef;
}

export interface ThreatDef {
  id: string;
  villain: VillainId;
  name: string;
  text: string;
  kind: 'henchman' | 'other';
  health?: number; // henchmen
  bam?: boolean; // has a BAM! effect
  onVillainEnter?: boolean; // ↻ effect when the Villain ends their movement here
  key: string; // script key
}

export interface VillainDef {
  id: VillainId;
  name: string;
  realName: string;
  color: string;
  health: { 2: number; 3: number; 4: number };
  bamText: string;
  overflowText: string;
  plotText?: string;
  specialRules?: string;
  track?: { name: string; max: number };
  masterPlan: MasterPlanDef[];
  threats: ThreatDef[];
}

export interface LocationDef {
  id: LocationId;
  name: string;
  slots: number;
  startCivilians: number;
  startThugs: number;
  endOfTurn: SpecialDef;
}

/* ─────────── game state (dynamic) ─────────── */

export interface CardInst {
  uid: number;
  id: string; // HeroCardDef id
}

export interface ThreatState {
  id: string;
  health: number; // henchmen: remaining health
  heroic: number; // 'other' threats: Heroic Action tokens placed (3 clears it)
}

export interface LocationState {
  id: LocationId;
  civilians: number;
  thugs: number;
  crisis: number;
  threat: ThreatState | null;
  wounded: number; // Thugs here that took 1 damage this turn (Elite Thugs need 2 in the same turn)
}

// Something a Hero action can be aimed at.
export type Target =
  | { kind: 'thug'; loc: number }
  | { kind: 'civilian'; loc: number }
  | { kind: 'threat'; loc: number } // Henchman (attack) or other Threat (heroic)
  | { kind: 'villain'; loc: number }
  | { kind: 'crisis'; loc: number }; // Taskmaster: discard a Crisis token

export interface HeroState {
  id: HeroId;
  loc: number;
  crisis: number;
  invulnerable: boolean;
  ko: boolean;
}

export type StoryEntry =
  | { kind: 'hero'; uid: number; id: string; hero: HeroId }
  | { kind: 'plan'; id: string };

export type MissionKey = 'thugs' | 'civilians' | 'threats';

export interface MissionState {
  thugs: number;
  civilians: number;
  threats: number;
  done: MissionKey[]; // in completion order
}

export interface TurnState {
  heroIdx: number;
  playedUid: number;
  playedId: string;
  prevSyms: Sym[]; // symbols of the previous Hero card in the Storyline
  pool: Record<Sym, number>; // symbols still available this turn
  used: Record<Sym, number>; // symbols spent this turn (for Quantum Leap re-computation)
  specialUsed: boolean;
  locationEffectUsed: boolean;
  // remote attacks granted by a special (Photon Blast): { loc, n }
  remote: { loc: number; n: number } | null;
}

export type Phase = 'setup' | 'hero' | 'villain' | 'gameover';

export interface LogLine {
  msg: string;
  cls: string;
  turn: number;
}

export interface GameOptions {
  challenge: Challenge;
  seed: string;
  // Solo rule: a KO is an immediate loss (0). The designers suggest allowing one
  // extra KO against tough Villains (1): the Hero is laid down, the Villain's BAM!
  // fires, and at the next Hero turn every KO'd Hero stands up and you draw up to 4.
  koLimit: number;
}

export interface GameState {
  options: GameOptions;
  rng: number; // PRNG state
  villain: VillainId;
  heroes: HeroState[];
  locations: LocationState[]; // 6, clockwise
  villainLoc: number;
  villainHealth: number;
  track: number; // Red Skull's Fear Track
  masterPlanDeck: string[];
  storyline: StoryEntry[];
  deck: CardInst[];
  hand: CardInst[];
  tokens: Record<Sym, number>; // action tokens owned by the player
  missions: MissionState;
  heroCardsSincePlan: number;
  koCount: number;
  phase: Phase;
  turn: TurnState | null;
  turnNo: number;
  nextUid: number;
  log: LogLine[];
  gameOver: { win: boolean; title: string; sub: string } | null;
}

/* ─────────── UI seam ─────────── */

export interface ChoiceOption<T> {
  label: string;
  value: T;
  hint?: string;
  danger?: boolean;
}

export interface PickOpts {
  title: string;
  min: number;
  max: number;
  cancel?: string; // label of a cancel button (omit = not cancelable)
}

export interface UIPort {
  // choose one option (or null when cancelable and cancelled)
  choose<T>(title: string, prompt: string, options: ChoiceOption<T>[], cancel?: string): Promise<T | null>;
  // pick cards from a list (hand, storyline…)
  pickCards(cards: CardInst[], opts: PickOpts): Promise<CardInst[] | null>;
  // highlight-driven pick of a location (candidates are indices) — null when cancelled
  pickLocation(title: string, candidates: number[], cancel?: string): Promise<number | null>;
  // pick a hero (index into G.heroes)
  pickHero(title: string, candidates: number[], cancel?: string): Promise<number | null>;
  // let the engine show a card (Interrogate)
  showCard(title: string, planId: string): Promise<void>;
  render(): void;
}
