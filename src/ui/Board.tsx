// Board.tsx — the six Locations around the table, with tokens, Threats, the
// Villain and the Hero minis. Clicking things performs the matching action.
//
// With scans (public/img/locations) each Location is the real square card with the
// live state overlaid on the printed slots; without scans a CSS tile is used.

import { HERO_BY_ID, LOCATION_BY_ID, VILLAIN_BY_ID } from '../data';
import * as E from '../engine/game';
import type { GameState, LocationState, Target } from '../types';
import { A, img } from './assets';
import { ThreatCard } from './Card';
import { CardText, Icon } from './Icons';
import { currentModal, hidePreview, run, showPreview } from './store';

// Visual order around the ring: top row left→right = 0,1,2; bottom row right→left = 3,4,5.
const GRID: Record<number, string> = { 0: 'a', 1: 'b', 2: 'c', 3: 'f', 4: 'e', 5: 'd' };

// Printed slot geometry on the Core Set Location cards (fractions of the square).
const SLOT_LEFT0 = 14.5;
const SLOT_STEP = 14.5;
const SLOT_TOP = 14;
const SLOT_W = 10;
const SLOT_H = 10.5;

export function Board({ G }: { G: GameState }) {
  const modal = currentModal();
  const locPick = modal?.kind === 'location' ? modal : null;
  const heroPick = modal?.kind === 'hero' ? modal : null;
  return (
    <div className="board">
      {G.locations.map((L, i) => (
        <div key={L.id} className={`loc-cell area-${GRID[i]}`}>
          <LocationView
            G={G}
            L={L}
            idx={i}
            pickable={locPick ? locPick.candidates.includes(i) : false}
            onPick={locPick ? () => locPick.resolve(i) : undefined}
            heroPick={heroPick ? heroPick.candidates : null}
            onHeroPick={heroPick ? (h: number) => heroPick.resolve(h) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

function LocationView({
  G,
  L,
  idx,
  pickable,
  onPick,
  heroPick,
  onHeroPick,
}: {
  G: GameState;
  L: LocationState;
  idx: number;
  pickable: boolean;
  onPick?: () => void;
  heroPick: number[] | null;
  onHeroPick?: (h: number) => void;
}) {
  const def = LOCATION_BY_ID[L.id];
  const t = G.turn;
  const hero = E.activeHero();
  const here = hero?.loc === idx;
  const villainHere = G.villainLoc === idx;
  const V = VILLAIN_BY_ID[G.villain];
  const threatDef = E.threatDef(idx);
  const interactive = G.phase === 'hero' && !!t && !currentModal();
  const art = img(A.location(L.id));

  const canMove = interactive && E.canMoveTo(idx);
  const remote = interactive && t?.remote?.loc === idx && (t.remote.n ?? 0) > 0;
  const tgt = (kind: Target['kind']): Target => ({ kind, loc: idx });
  const canAtk = (k: Target['kind']) => interactive && E.canAttack(tgt(k));
  const canHer = (k: Target['kind']) => interactive && E.canHeroic(tgt(k));
  const act = (fn: () => Promise<void>) => void run(fn);

  const onCrisis = () => {
    const a = canAtk('crisis');
    const h = canHer('crisis');
    if (a && h) {
      act(async () => {
        const r = await E.ui.choose('Discard a Crisis token', `Spend which action at ${def.name}?`, [
          { label: 'Attack', value: 'a' },
          { label: 'Heroic', value: 'h' },
        ]);
        if (r === 'a') await E.attack(tgt('crisis'));
        else if (r === 'h') await E.heroic(tgt('crisis'));
      });
    } else if (a) act(() => E.attack(tgt('crisis')));
    else if (h) act(() => E.heroic(tgt('crisis')));
  };

  const filled: ('thug' | 'civilian')[] = [
    ...Array.from({ length: L.thugs }, () => 'thug' as const),
    ...Array.from({ length: L.civilians }, () => 'civilian' as const),
  ];

  const slotButton = (i: number, extraStyle?: React.CSSProperties) => {
    const k = filled[i];
    if (!k) return <span key={i} className="slot empty" style={extraStyle} />;
    const clickable = k === 'thug' ? canAtk('thug') : canHer('civilian');
    const wounded = k === 'thug' && i < L.wounded;
    return (
      <button
        key={i}
        className={`slot ${k} ${clickable ? 'target' : ''} ${wounded ? 'wounded' : ''}`}
        style={extraStyle}
        disabled={!clickable}
        title={k === 'thug' ? (wounded ? 'Thug (wounded)' : 'Thug — attack') : `Civilian — rescue${E.heroicCost(tgt('civilian')) > 1 ? ' (2 heroic)' : ''}`}
        onClick={() => act(() => (k === 'thug' ? E.attack(tgt('thug')) : E.heroic(tgt('civilian'))))}
      >
        <Icon g={k} size={22} />
      </button>
    );
  };

  const crisisBtn = L.crisis > 0 && (
    <button className={`crisis ${canAtk('crisis') || canHer('crisis') ? 'target' : ''}`} onClick={onCrisis} title="Crisis tokens">
      <Icon g="crisis" size={16} /> ×{L.crisis}
    </button>
  );
  const moveBtn = canMove && (
    <button className="move-btn" onClick={() => act(() => E.moveHero(idx))} title={`Move here (${E.moveCost(hero!.loc)} move)`}>
      <Icon g="move" size={16} /> {E.moveCost(hero!.loc) > 1 ? '×2' : ''}
    </button>
  );
  const remoteBadge = remote && (
    <div className="remote-badge">
      <Icon g="attack" size={14} /> {t!.remote!.n} attack{t!.remote!.n > 1 ? 's' : ''} here
    </div>
  );

  const villainMini = villainHere && (
    <button
      className={`mini villain ${canAtk('villain') ? 'target' : ''}`}
      style={{ ['--villain' as string]: V.color }}
      disabled={!canAtk('villain')}
      title={canAtk('villain') ? `Attack ${V.name}` : V.name}
      onClick={() => act(() => E.attack(tgt('villain')))}
    >
      {img(A.figure(V.id)) ? <img className="figure" src={img(A.figure(V.id))!} alt={V.name} draggable={false} /> : <><Icon g="villain" size={16} /> {V.name}</>}
    </button>
  );
  const heroMinis = G.heroes.map((h, hi) =>
    h.loc === idx ? (
      <button
        key={h.id}
        className={`mini hero ${h.ko ? 'ko' : ''} ${t?.heroIdx === hi ? 'active' : ''} ${heroPick?.includes(hi) ? 'pickable' : ''}`}
        style={{ ['--hero' as string]: HERO_BY_ID[h.id].color }}
        disabled={!heroPick?.includes(hi)}
        onClick={() => onHeroPick?.(hi)}
        title={`${HERO_BY_ID[h.id].name}${h.crisis ? ` · ${h.crisis} Crisis` : ''}${h.invulnerable ? ' · Invulnerable' : ''}${h.ko ? " · KO'd" : ''}`}
      >
        {img(A.figure(h.id)) ? <img className="figure" src={img(A.figure(h.id))!} alt={HERO_BY_ID[h.id].name} draggable={false} /> : HERO_BY_ID[h.id].name}
        {h.crisis > 0 && (
          <span className="badge crisis-badge">
            <Icon g="crisis" size={11} />
            {h.crisis}
          </span>
        )}
        {h.invulnerable && (
          <span className="badge inv">
            <Icon g="invulnerable" size={12} />
          </span>
        )}
        {h.ko && (
          <span className="badge ko">
            <Icon g="ko" size={12} />
          </span>
        )}
      </button>
    ) : null
  );

  const threatEl = L.threat && threatDef && (
    <ThreatCard
      id={L.threat.id}
      health={L.threat.health}
      heroic={L.threat.heroic}
      small
      clickable={threatDef.kind === 'henchman' ? canAtk('threat') : canHer('threat')}
      onClick={() => {
        if (threatDef.kind === 'henchman' && canAtk('threat')) act(() => E.attack(tgt('threat')));
        else if (threatDef.kind === 'other' && canHer('threat')) act(() => E.heroic(tgt('threat')));
      }}
    />
  );

  const state = [here ? 'active-here' : '', villainHere ? 'villain-here' : '', pickable ? 'pickable' : '', canMove ? 'can-move' : '', remote ? 'remote' : '']
    .filter(Boolean)
    .join(' ');

  /* ── scan version ── */
  if (art) {
    return (
      <div
        className={`location art ${state}`}
        style={{ backgroundImage: `url(${art})` }}
        onClick={pickable ? onPick : undefined}
        onMouseEnter={() => showPreview('location', L.id)}
        onMouseLeave={hidePreview}
      >
        <span className="sr-only">{def.name}</span>
        {Array.from({ length: def.slots }).map((_, i) =>
          slotButton(i, { left: `${SLOT_LEFT0 + i * SLOT_STEP}%`, top: `${SLOT_TOP}%`, width: `${SLOT_W}%`, height: `${SLOT_H}%` })
        )}
        <div className="art-topright">
          {crisisBtn}
          {moveBtn}
        </div>
        {remoteBadge}
        <div className="minis art-minis">
          {villainMini}
          {heroMinis}
        </div>
        {threatEl && <div className="art-threat">{threatEl}</div>}
        {!L.threat && here && !t?.locationEffectUsed && <div className="eot-hint">End of Turn effect available</div>}
      </div>
    );
  }

  /* ── CSS fallback ── */
  return (
    <div className={`location ${state}`} onClick={pickable ? onPick : undefined}>
      <div className="loc-head">
        <span className="loc-name">{def.name}</span>
        {crisisBtn}
        {moveBtn}
      </div>
      <div className="slots">{Array.from({ length: def.slots }).map((_, i) => slotButton(i))}</div>
      <div className="minis">
        {villainMini}
        {heroMinis}
      </div>
      {threatEl ?? (
        <div className="end-of-turn">
          <div className="eot-title">End of Turn</div>
          <div className="eot-text">
            <CardText text={def.endOfTurn.text} size={12} />
          </div>
        </div>
      )}
      {remoteBadge}
    </div>
  );
}
