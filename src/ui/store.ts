// store.ts — the seam between the mutable engine state and React.
//
// The engine mutates G in place and calls UI.render(); here that becomes a version
// bump on a tiny external store (useSyncExternalStore). Engine prompts park a modal
// request here and return a promise that the modal component resolves.

import { useSyncExternalStore } from 'react';
import type { CardInst, ChoiceOption, GameState, PickOpts, UIPort } from '../types';
import { getG, log, restore, setUI, snapshot } from '../engine/game';

/* ─────────── version store ─────────── */
type Listener = () => void;
let version = 0;
const listeners = new Set<Listener>();
function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function notify() {
  version++;
  for (const l of [...listeners]) l();
}
export function useGame(): GameState | null {
  useSyncExternalStore(subscribe, () => version);
  return getG();
}

/* ─────────── modal requests ─────────── */
export type ModalRequest =
  | {
      kind: 'choice';
      id: number;
      title: string;
      prompt: string;
      options: ChoiceOption<unknown>[];
      cancel?: string;
      resolve: (v: unknown) => void;
    }
  | {
      kind: 'pick';
      id: number;
      cards: CardInst[];
      opts: PickOpts;
      resolve: (v: CardInst[] | null) => void;
    }
  | {
      kind: 'location';
      id: number;
      title: string;
      candidates: number[];
      cancel?: string;
      resolve: (v: number | null) => void;
    }
  | {
      kind: 'hero';
      id: number;
      title: string;
      candidates: number[];
      cancel?: string;
      resolve: (v: number | null) => void;
    }
  | { kind: 'show'; id: number; title: string; planId: string; resolve: () => void };

let modal: ModalRequest | null = null;
let modalId = 0;
export function currentModal(): ModalRequest | null {
  return modal;
}
function settle<T>(fill: (id: number, done: (v: T) => void) => ModalRequest): Promise<T> {
  return new Promise<T>(res => {
    modal = fill(++modalId, v => {
      modal = null;
      notify();
      res(v);
    });
    notify();
  });
}

/* ─────────── hover preview ─────────── */
export type PreviewKind = 'hero' | 'plan' | 'threat' | 'dashboard' | 'location' | 'mission';
let preview: { kind: PreviewKind; id: string } | null = null;
export function currentPreview() {
  return preview;
}
export function showPreview(kind: PreviewKind, id: string) {
  preview = { kind, id };
  notify();
}
export function hidePreview() {
  preview = null;
  notify();
}

/* ─────────── guarded action dispatch (with undo snapshot) ─────────── */
let busy = false;
const snapshots: string[] = [];

export function isBusy() {
  return busy;
}
export async function run(fn: () => void | Promise<void>, { snap = true } = {}) {
  const G = getG();
  if (busy || G?.gameOver) {
    notify();
    return;
  }
  busy = true;
  try {
    if (snap && G) pushSnapshot();
    await fn();
  } finally {
    busy = false;
    notify();
  }
}
function pushSnapshot() {
  snapshots.push(snapshot());
  if (snapshots.length > 60) snapshots.shift();
}
export function undo() {
  const G = getG();
  if (busy || !snapshots.length || !G) return;
  restore(snapshots.pop()!);
  log('↩ Undo.', 'sys');
  notify();
}
export function canUndo(): boolean {
  return snapshots.length > 0 && !busy;
}
export function clearSnapshots() {
  snapshots.length = 0;
}

/* ─────────── the UIPort the engine talks to ─────────── */
export const reactUI: UIPort = {
  choose<T>(title: string, prompt: string, options: ChoiceOption<T>[], cancel?: string) {
    return settle<T | null>((id, done) => ({
      kind: 'choice',
      id,
      title,
      prompt,
      options: options as ChoiceOption<unknown>[],
      cancel,
      resolve: v => done(v as T | null),
    }));
  },
  pickCards(cards: CardInst[], opts: PickOpts) {
    return settle<CardInst[] | null>((id, done) => ({ kind: 'pick', id, cards, opts, resolve: done }));
  },
  pickLocation(title: string, candidates: number[], cancel?: string) {
    return settle<number | null>((id, done) => ({ kind: 'location', id, title, candidates, cancel, resolve: done }));
  },
  pickHero(title: string, candidates: number[], cancel?: string) {
    return settle<number | null>((id, done) => ({ kind: 'hero', id, title, candidates, cancel, resolve: done }));
  },
  showCard(title: string, planId: string) {
    return settle<void>((id, done) => ({ kind: 'show', id, title, planId, resolve: () => done() }));
  },
  render() {
    notify();
  },
};

setUI(reactUI);
