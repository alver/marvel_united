// Card.tsx — Hero cards, Master Plan cards and Threat cards. When the asset build
// provides a scan (public/img/cards, public/img/threats) the scan is shown; the
// CSS rendering is the fallback for missing images.

import { HERO_BY_ID, HERO_CARD_BY_ID, PLAN_BY_ID, THREAT_BY_ID, VILLAIN_BY_ID } from '../data';
import type { MasterPlanDef, ThreatDef } from '../types';
import { A, img } from './assets';
import { CardText, Icon, SymRow } from './Icons';
import { hidePreview, showPreview } from './store';

function cls(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(' ');
}

export function HeroCard({
  id,
  small,
  onClick,
  selected,
  disabled,
  highlight,
}: {
  id: string;
  small?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const c = HERO_CARD_BY_ID[id];
  const h = HERO_BY_ID[c.hero];
  const scan = img(A.card(id));
  const common = {
    className: cls('card', 'hero-card', scan && 'scan-card', small && 'small', selected && 'selected', disabled && 'disabled', highlight && 'highlight', onClick && 'clickable'),
    style: { ['--hero' as string]: h.color },
    onClick,
    onMouseEnter: () => showPreview('hero', id),
    onMouseLeave: hidePreview,
  };
  if (scan)
    return (
      <div {...common}>
        <img src={scan} alt={`${h.name} card`} draggable={false} decoding="async" />
      </div>
    );
  return (
    <div {...common}>
      <div className="card-head">
        <span className="hero-dot" />
        <span className="card-name">{h.name}</span>
      </div>
      <div className="card-art">
        <span className="art-initial">{h.name.slice(0, 1)}</span>
      </div>
      {c.special && (
        <div className="card-special">
          <div className="special-name">{c.special.name}</div>
          <div className="special-text">
            <CardText text={c.special.text} size={small ? 11 : 13} />
          </div>
        </div>
      )}
      <div className="card-syms">
        <SymRow syms={c.syms} size={small ? 18 : 26} />
      </div>
    </div>
  );
}

export function PlanCard({ id, small }: { id: string; small?: boolean }) {
  const p: MasterPlanDef = PLAN_BY_ID[id];
  const v = VILLAIN_BY_ID[p.villain];
  const scan = img(A.card(id));
  const common = {
    className: cls('card', 'plan-card', scan && 'scan-card', small && 'small'),
    style: { ['--villain' as string]: v.color },
    onMouseEnter: () => showPreview('plan', id),
    onMouseLeave: hidePreview,
  };
  if (scan)
    return (
      <div {...common}>
        <img src={scan} alt={`${v.name} Master Plan card`} draggable={false} decoding="async" />
      </div>
    );
  return (
    <div {...common}>
      <div className="card-head">
        <span className="card-name">{v.name}</span>
      </div>
      <div className="plan-body">
        <div className="plan-art" />
        <div className="plan-right">
          <div className="plan-move" title={`Move ${p.move}`}>
            <span className="arrow">↻</span>
            <span className="n">{p.move}</span>
          </div>
          {p.bam && (
            <div className="plan-bam">
              <Icon g="bam" size={small ? 16 : 22} />
            </div>
          )}
        </div>
      </div>
      {p.special && (
        <div className="card-special">
          <div className="special-name">{p.special.name}</div>
          <div className="special-text">
            <CardText text={p.special.text} size={small ? 11 : 13} />
          </div>
        </div>
      )}
      {p.tokens && (
        <div className="plan-tokens">
          {p.tokens.map((t, i) => (
            <div key={i} className={`slot ${i === 1 ? 'center' : ''}`} title={i === 1 ? "Villain's Location" : i === 0 ? 'counter-clockwise' : 'clockwise'}>
              {i === 1 && <span className="pin">⌖</span>}
              {Array.from({ length: t.thugs }).map((_, k) => (
                <Icon key={'t' + k} g="thug" size={small ? 12 : 16} />
              ))}
              {Array.from({ length: t.civilians }).map((_, k) => (
                <Icon key={'c' + k} g="civilian" size={small ? 12 : 16} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Positions (fractions of the landscape scan) of the printed health hexagon and
// the three Heroic Action slots, measured on the Core Set cards.
const THREAT_HEALTH_POS = { left: '3%', top: '62%', width: '10%', height: '32%' };
const THREAT_STAR_X = ['20%', '50%', '80%'];

export function ThreatCard({
  id,
  health,
  heroic,
  small,
  onClick,
  clickable,
  plain,
}: {
  id: string;
  health?: number;
  heroic?: number;
  small?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  plain?: boolean; // preview: no state overlays
}) {
  const t: ThreatDef = THREAT_BY_ID[id];
  const v = VILLAIN_BY_ID[t.villain];
  const scan = img(A.threat(id));
  const common = {
    className: cls('card', 'threat-card', scan && 'threat-scan', small && 'small', clickable && 'clickable target'),
    style: { ['--villain' as string]: v.color },
    onClick,
    onMouseEnter: () => showPreview('threat', id),
    onMouseLeave: hidePreview,
  };
  if (scan)
    return (
      <div {...common}>
        <img src={scan} alt={t.name} draggable={false} decoding="async" />
        {!plain && t.kind === 'henchman' && (
          <span className="t-health" style={THREAT_HEALTH_POS} title="Health">
            {health ?? t.health}
          </span>
        )}
        {!plain &&
          t.kind === 'other' &&
          THREAT_STAR_X.map((x, i) =>
            i < (heroic ?? 0) ? (
              <span key={i} className="t-star" style={{ left: x }} title="Heroic Action token">
                <Icon g="heroic" size={100} />
              </span>
            ) : null
          )}
      </div>
    );
  return (
    <div {...common}>
      <div className="card-head">
        <span className="card-name">{t.name}</span>
        {t.onVillainEnter && <Icon g="enter" size={16} title="triggers when the Villain ends their movement here" />}
      </div>
      <div className="threat-text">
        <CardText text={t.text} size={small ? 11 : 13} />
      </div>
      <div className="threat-foot">
        {t.kind === 'henchman' ? (
          <span className="henchman-health" title="Health">
            <Icon g="health" size={16} /> {health ?? t.health}
          </span>
        ) : (
          <span className="heroic-slots" title="Heroic Action tokens needed">
            {[0, 1, 2].map(i => (
              <span key={i} className={`hslot ${i < (heroic ?? 0) ? 'filled' : ''}`}>
                <Icon g="heroic" size={16} />
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export function CardBack({ src, className, title }: { src: string | null; className?: string; title?: string }) {
  if (!src) return <div className={cls('card', 'card-back', className)} title={title} />;
  return (
    <div className={cls('card', 'card-back', 'scan-card', className)} title={title}>
      <img src={src} alt="" draggable={false} decoding="async" />
    </div>
  );
}
