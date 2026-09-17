// Modals.tsx — the engine's prompts as modal dialogs / banners.

import { useState } from 'react';
import { HERO_BY_ID } from '../data';
import type { CardInst, GameState } from '../types';
import { HeroCard, PlanCard } from './Card';
import { currentModal, type ModalRequest } from './store';

export function Modals({ G }: { G: GameState }) {
  const m = currentModal();
  if (!m) return null;
  switch (m.kind) {
    case 'choice':
      return (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{m.title}</h3>
            <p>{m.prompt}</p>
            <div className="modal-options">
              {m.options.map((o, i) => (
                <button key={i} className={`btn ${o.danger ? 'danger' : ''}`} onClick={() => m.resolve(o.value)}>
                  {o.label}
                  {o.hint && <small>{o.hint}</small>}
                </button>
              ))}
              {m.cancel && (
                <button className="btn ghost" onClick={() => m.resolve(null)}>
                  {m.cancel}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    case 'pick':
      return <PickModal m={m} />;
    case 'location':
      return (
        <div className="banner">
          <span>{m.title}</span>
          <small>Click a highlighted Location.</small>
          {m.cancel && (
            <button className="btn ghost" onClick={() => m.resolve(null)}>
              {m.cancel}
            </button>
          )}
        </div>
      );
    case 'hero':
      return (
        <div className="banner">
          <span>{m.title}</span>
          {m.candidates.map(i => (
            <button key={i} className="btn" style={{ ['--hero' as string]: HERO_BY_ID[G.heroes[i].id].color }} onClick={() => m.resolve(i)}>
              {HERO_BY_ID[G.heroes[i].id].name}
            </button>
          ))}
          {m.cancel && (
            <button className="btn ghost" onClick={() => m.resolve(null)}>
              {m.cancel}
            </button>
          )}
        </div>
      );
    case 'show':
      return (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{m.title}</h3>
            <div className="modal-cards">
              <PlanCard id={m.planId} />
            </div>
            <div className="modal-options">
              <button className="btn" onClick={() => m.resolve()}>
                OK
              </button>
            </div>
          </div>
        </div>
      );
  }
}

function PickModal({ m }: { m: Extract<ModalRequest, { kind: 'pick' }> }) {
  const [sel, setSel] = useState<CardInst[]>([]);
  const toggle = (c: CardInst) => {
    if (m.opts.max === 1) {
      m.resolve([c]);
      return;
    }
    setSel(s => (s.some(x => x.uid === c.uid) ? s.filter(x => x.uid !== c.uid) : s.length < m.opts.max ? [...s, c] : s));
  };
  return (
    <div className="modal-backdrop">
      <div className="modal wide">
        <h3>{m.opts.title}</h3>
        <div className="modal-cards">
          {m.cards.map(c => (
            <HeroCard key={c.uid} id={c.id} onClick={() => toggle(c)} selected={sel.some(x => x.uid === c.uid)} />
          ))}
        </div>
        <div className="modal-options">
          {m.opts.max > 1 && (
            <button className="btn" disabled={sel.length < m.opts.min} onClick={() => m.resolve(sel)}>
              Confirm ({sel.length})
            </button>
          )}
          {m.opts.cancel && (
            <button className="btn ghost" onClick={() => m.resolve(null)}>
              {m.opts.cancel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
