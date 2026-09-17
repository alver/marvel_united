// HandBar.tsx — the player's hand, the action pool of the current turn and the
// turn buttons (special effect, end turn, undo).

import { HERO_BY_ID, HERO_CARD_BY_ID } from '../data';
import * as E from '../engine/game';
import type { GameState, Sym } from '../types';
import { SYMS } from '../types';
import { A, img } from './assets';
import { HeroCard } from './Card';
import { Icon } from './Icons';
import { canUndo, currentModal, isBusy, run, undo } from './store';

export function HandBar({ G }: { G: GameState }) {
  const t = G.turn;
  const modal = currentModal();
  const canPlay = G.phase === 'hero' && !t && !modal && !isBusy();
  const special = t ? HERO_CARD_BY_ID[t.playedId].special : null;
  // The solo rules let you use the different card backs: show the top card's back.
  const top = G.deck[0];
  const back = top ? img(A.heroBack(HERO_CARD_BY_ID[top.id].hero)) : null;
  return (
    <div className="handbar">
      <div className="actionbar">
        {t ? (
          <>
            <div className="ab-hero" style={{ ['--hero' as string]: HERO_BY_ID[G.heroes[t.heroIdx].id].color }}>
              <span className="hero-dot" /> {E.heroName(t.heroIdx)}'s turn
            </div>
            <div className="pool">
              {SYMS.map(s => (
                <PoolSym key={s} sym={s} pool={t.pool[s]} tokens={G.tokens[s]} />
              ))}
              {t.remote && (
                <span className="pool-remote">
                  <Icon g="attack" size={18} /> ×{t.remote.n} at {E.locName(t.remote.loc)}
                </span>
              )}
            </div>
            {special && (
              <button className="btn special" disabled={!E.canUseSpecial() || !!modal || isBusy()} onClick={() => void run(() => E.useSpecial())} title={special.text.replace(/\{(\w+)\}/g, '$1')}>
                ✦ {special.name}
                {t.specialUsed && ' (used)'}
              </button>
            )}
            <button className="btn end" disabled={!!modal || isBusy()} onClick={() => void run(() => E.endTurn())}>
              End turn {E.locationEffectAvailable() ? '· Location effect available' : ''}
            </button>
          </>
        ) : (
          <div className="ab-hint">
            {G.phase === 'hero' ? 'Play a card from your hand — its Hero becomes the active Hero.' : G.phase === 'villain' ? 'Villain turn…' : ''}
          </div>
        )}
        <div className="tokens" title="Action tokens (usable by any Hero, any turn)">
          {SYMS.filter(s => G.tokens[s] > 0).map(s => (
            <span key={s} className="token">
              <Icon g={s} size={16} /> ×{G.tokens[s]}
            </span>
          ))}
        </div>
        <button className="btn undo" disabled={!canUndo()} onClick={undo} title="Undo the last action">
          ↩ Undo
        </button>
      </div>
      <div className="hand">
        <div className="deck-info">
          <div
            className={`deck-count ${back ? 'has-back' : ''}`}
            style={back ? { backgroundImage: `url(${back})` } : undefined}
            title={top ? `S.H.I.E.L.D. deck — the top card is ${HERO_BY_ID[HERO_CARD_BY_ID[top.id].hero].name}'s (card backs differ!)` : 'S.H.I.E.L.D. deck'}
          >
            <b>{G.deck.length}</b>
            <span>deck</span>
          </div>
        </div>
        {G.hand.map(c => (
          <HeroCard key={c.uid} id={c.id} onClick={canPlay ? () => void run(() => E.playCard(c.uid)) : undefined} disabled={!canPlay} />
        ))}
        {G.hand.length === 0 && <div className="hand-empty">No cards in hand!</div>}
      </div>
    </div>
  );
}

function PoolSym({ sym, pool, tokens }: { sym: Sym; pool: number; tokens: number }) {
  return (
    <span className={`pool-sym ${pool + tokens > 0 ? '' : 'zero'}`} title={`${sym}: ${pool} from cards${tokens ? `, ${tokens} token${tokens > 1 ? 's' : ''}` : ''}`}>
      <Icon g={sym} size={22} />
      <b>{pool}</b>
    </span>
  );
}
