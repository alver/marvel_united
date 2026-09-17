// Panels.tsx — Villain dashboard, Mission cards, Storyline, Log, Hero strip, hover preview.

import { useEffect, useRef } from 'react';
import { HERO_BY_ID, LOCATION_BY_ID, MISSION_NAME, MISSION_SIZE, VILLAIN_BY_ID } from '../data';
import * as E from '../engine/game';
import type { GameState, MissionKey } from '../types';
import { A, img } from './assets';
import { HeroCard, PlanCard, ThreatCard } from './Card';
import { CardText, Icon } from './Icons';
import { currentPreview, hidePreview, showPreview } from './store';

/* ─────────── Villain dashboard ─────────── */

// Red Skull's printed Fear Track: cell centres as fractions of the dashboard scan.
function fearCell(n: number): { left: string; top: string } {
  if (n <= 0) return { left: '34.5%', top: '56.5%' };
  const col = (n - 1) % 10;
  const row = n <= 10 ? 0 : 1;
  return { left: `${34.5 + col * 6.5}%`, top: row === 0 ? '69%' : '81.5%' };
}

export function VillainPanel({ G }: { G: GameState }) {
  const V = VILLAIN_BY_ID[G.villain];
  const vulnerable = E.isVulnerable();
  const dash = img(A.dashboard(V.id));
  const health = Math.max(0, G.villainHealth);
  const lock = !vulnerable ? 'complete 2 Missions first' : !E.villainDamageable() ? 'Crisis tokens on Locations' : null;
  return (
    <div className="panel villain-panel" style={{ ['--villain' as string]: V.color }}>
      {dash ? (
        <div className="dash" onMouseEnter={() => showPreview('dashboard', V.id)} onMouseLeave={hidePreview}>
          <img src={dash} alt={`${V.name} dashboard`} draggable={false} decoding="async" />
          <div className={`dash-health ${lock ? 'locked' : ''}`} title={lock ? `Cannot be damaged: ${lock}` : 'Health'}>
            <Icon g="health" size={18} /> {health}
            {lock && <span className="lock">🔒</span>}
          </div>
          {V.track && (
            <div className="fear-marker" style={fearCell(G.track)} title={`Fear Track: ${G.track}`}>
              {G.track}
            </div>
          )}
        </div>
      ) : (
        <div className="vp-head">
          <div>
            <div className="vp-name">{V.name}</div>
            <div className="vp-health" title="Health">
              {Array.from({ length: health }).map((_, i) => (
                <Icon key={i} g="health" size={18} />
              ))}
              <span className="n">{health}</span>
              {lock && <span className="locked">🔒 {lock}</span>}
            </div>
          </div>
        </div>
      )}
      <div className="vp-deck">
        <b>{V.name}</b> at {E.locName(G.villainLoc)} · Master Plan deck <b>{G.masterPlanDeck.length}</b> · next Villain turn in{' '}
        <b>{Math.max(0, E.planEvery() - G.heroCardsSincePlan)}</b> Hero card{E.planEvery() - G.heroCardsSincePlan === 1 ? '' : 's'}
        {G.missions.done.length >= 1 && <span className="pressure"> · Under Pressure</span>}
      </div>
      <details className="vp-details" open={!dash}>
        <summary>Dashboard text</summary>
        <div className="vp-box">
          <div className="vp-label">
            <Icon g="bam" size={16} />
          </div>
          <CardText text={V.bamText} size={13} />
        </div>
        <div className="vp-box">
          <div className="vp-label">Overflow</div>
          <CardText text={V.overflowText} size={13} />
        </div>
        {V.plotText && (
          <div className="vp-box plot">
            <div className="vp-label">Villainous Plot</div>
            <CardText text={V.plotText} size={13} />
            {V.track && !dash && (
              <div className="track">
                {Array.from({ length: V.track.max }).map((_, i) => (
                  <span key={i} className={`tick ${i < G.track ? 'on' : ''} ${i === V.track!.max - 1 ? 'last' : ''}`}>
                    {i + 1}
                  </span>
                ))}
                <span className="track-n">{G.track}</span>
              </div>
            )}
          </div>
        )}
        {V.specialRules && (
          <div className="vp-box">
            <div className="vp-label">Special Rules</div>
            <CardText text={V.specialRules} size={13} />
          </div>
        )}
      </details>
    </div>
  );
}

/* ─────────── Mission guide ─────────── */

const UNLOCKS = ['Villain acts after every 2 Hero cards', 'Villain is now vulnerable to damage', 'Each Hero immediately draws 1 card'];
const COLORS: Record<MissionKey, string> = { thugs: '#c33', civilians: '#4a6fb3', threats: '#7a3f9e' };
// Printed slot centres on the Mission cards (fractions of the card).
const GRID3 = { x: [23, 50, 77], y: [37, 57.5, 78], w: 21, h: 15 };
const GRID2 = { x: [32, 68], y: [43, 67], w: 24, h: 17 };

export function MissionPanel({ G }: { G: GameState }) {
  const M = G.missions;
  const order: MissionKey[] = ['thugs', 'civilians', 'threats'];
  return (
    <div className="panel mission-panel">
      <div className="unlocks">
        {UNLOCKS.map((u, i) => (
          <div key={i} className={`unlock ${M.done.length > i ? 'on' : ''}`}>
            <span className="lock">{M.done.length > i ? '🔓' : '🔒'}</span> {u}
          </div>
        ))}
      </div>
      <div className="missions">
        {order.map(k => {
          const done = M.done.includes(k);
          const scan = img(A.mission(k));
          const glyph = k === 'thugs' ? 'thug' : k === 'civilians' ? 'civilian' : 'threat';
          if (scan) {
            const g = k === 'threats' ? GRID2 : GRID3;
            return (
              <div key={k} className={`mission-scan ${done ? 'done' : ''}`} onMouseEnter={() => showPreview('mission', k)} onMouseLeave={hidePreview}>
                <img src={scan} alt={MISSION_NAME[k]} draggable={false} decoding="async" />
                {Array.from({ length: MISSION_SIZE[k] }).map((_, i) => {
                  if (i >= M[k]) return null;
                  const col = i % g.x.length;
                  const row = Math.floor(i / g.x.length);
                  return (
                    <span
                      key={i}
                      className="m-token"
                      style={{ left: `${g.x[col]}%`, top: `${g.y[row]}%`, width: `${g.w}%`, height: `${g.h}%` }}
                    >
                      <Icon g={glyph} size={100} />
                    </span>
                  );
                })}
                {done && <span className="m-done">COMPLETE</span>}
              </div>
            );
          }
          return (
            <div key={k} className={`mission ${done ? 'done' : ''}`} style={{ ['--m' as string]: COLORS[k] }}>
              <div className="m-name">{MISSION_NAME[k]}</div>
              <div className="m-slots">
                {Array.from({ length: MISSION_SIZE[k] }).map((_, i) => (
                  <span key={i} className={`mslot ${i < M[k] ? 'on' : ''}`}>
                    <Icon g={glyph} size={16} />
                  </span>
                ))}
              </div>
              <div className="m-count">{done ? 'complete' : `${M[k]}/${MISSION_SIZE[k]}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Storyline & log ─────────── */

export function Storyline({ G }: { G: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [G.storyline.length]);
  const lastHero = [...G.storyline].reverse().find(e => e.kind === 'hero');
  return (
    <div className="storyline" ref={ref}>
      <div className="story-label">Storyline</div>
      {G.storyline.length === 0 && <div className="story-empty">The story begins…</div>}
      {G.storyline.map((e, i) =>
        e.kind === 'plan' ? (
          <div key={i} className="story-entry plan">
            <PlanCard id={e.id} small />
          </div>
        ) : (
          <div key={i} className={`story-entry hero ${G.turn?.playedUid === e.uid ? 'current' : ''} ${lastHero === e && !G.turn ? 'last' : ''}`}>
            <HeroCard id={e.id} small />
          </div>
        )
      )}
    </div>
  );
}

export function Log({ G }: { G: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [G.log.length]);
  return (
    <div className="log" ref={ref}>
      {G.log.map((l, i) => (
        <div key={i} className={`logline ${l.cls}`}>
          {l.msg}
        </div>
      ))}
    </div>
  );
}

/* ─────────── hover preview ─────────── */

export function Preview() {
  const p = currentPreview();
  if (!p) return null;
  let body: React.ReactNode = null;
  if (p.kind === 'hero') body = <HeroCard id={p.id} />;
  else if (p.kind === 'plan') body = <PlanCard id={p.id} />;
  else if (p.kind === 'threat') body = <ThreatCard id={p.id} plain />;
  else if (p.kind === 'dashboard') {
    const src = img(A.dashboard(p.id));
    body = src ? <img className="preview-wide" src={src} alt="" /> : null;
  } else if (p.kind === 'location') {
    const src = img(A.location(p.id));
    body = src ? <img className="preview-square" src={src} alt={LOCATION_BY_ID[p.id as keyof typeof LOCATION_BY_ID]?.name ?? ''} /> : null;
  } else if (p.kind === 'mission') {
    const src = img(A.mission(p.id));
    body = src ? <img className="preview-card" src={src} alt="" /> : null;
  }
  if (!body) return null;
  return <div className={`preview preview-${p.kind}`}>{body}</div>;
}

/* ─────────── hero strip ─────────── */

export function HeroStrip({ G }: { G: GameState }) {
  return (
    <div className="hero-strip">
      {G.heroes.map((h, i) => {
        const fig = img(A.figure(h.id));
        return (
          <div key={h.id} className={`hs ${G.turn?.heroIdx === i ? 'active' : ''} ${h.ko ? 'ko' : ''}`} style={{ ['--hero' as string]: HERO_BY_ID[h.id].color }}>
            {fig && <img src={fig} alt="" draggable={false} />}
            <div>
              <div className="hs-name">{HERO_BY_ID[h.id].name}</div>
              <div className="hs-info">
                {E.locName(h.loc)}
                {h.crisis > 0 && (
                  <span className="badge crisis-badge">
                    <Icon g="crisis" size={11} /> {h.crisis}
                  </span>
                )}
                {h.invulnerable && (
                  <span className="badge inv">
                    <Icon g="invulnerable" size={12} /> invulnerable
                  </span>
                )}
                {h.ko && <span className="badge ko">KO</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
