// Icons.tsx — action symbols and tokens. Uses the scanned token images when the
// asset build provides them (public/img/tokens/*.webp), inline SVG otherwise.
// CardText renders {move}/{attack}/{heroic}/{wild}/{thug}/{civilian} placeholders as icons.

import type { ReactNode } from 'react';
import type { Sym } from '../types';
import { A, img } from './assets';

export type Glyph =
  | Sym
  | 'thug'
  | 'civilian'
  | 'crisis'
  | 'bam'
  | 'threat'
  | 'villain'
  | 'health'
  | 'enter'
  | 'ko'
  | 'invulnerable';

const TOKEN_FILE: Partial<Record<Glyph, string>> = {
  move: 'move',
  attack: 'attack',
  heroic: 'heroic',
  wild: 'wild',
  thug: 'thug',
  civilian: 'civilian',
  crisis: 'crisis',
  health: 'health',
  threat: 'threat',
  ko: 'ko',
  invulnerable: 'invulnerable',
};

const COLORS: Record<Sym, string> = {
  move: '#5aa02c',
  attack: '#d9412b',
  heroic: '#e6b422',
  wild: '#7a5cc7',
};

export function Icon({ g, size = 18, title }: { g: Glyph; size?: number; title?: string }) {
  const file = TOKEN_FILE[g];
  const src = file ? img(A.token(file)) : null;
  if (src)
    return (
      <img
        className={`icon icon-${g} icon-img`}
        src={src}
        width={size}
        height={size}
        alt={title ?? g}
        title={title}
        draggable={false}
        decoding="async"
      />
    );
  return <SvgIcon g={g} size={size} title={title} />;
}

function SvgIcon({ g, size, title }: { g: Glyph; size: number; title?: string }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 24 24', className: `icon icon-${g}`, 'aria-label': title ?? g, role: 'img' as const };
  switch (g) {
    case 'move':
      return (
        <svg {...common}>
          <path d="M3 13.5c4-6 9-7 13-6.5V3.5l5 6-5 6v-3.6c-4-.4-9 1.3-13 6.6z" fill={COLORS.move} stroke="#1f3d0d" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case 'attack':
      return (
        <svg {...common}>
          <path d="M12 1.5l2.4 5.2 5.4-2.2-2.2 5.4 5.2 2.4-5.2 2.4 2.2 5.4-5.4-2.2L12 22.5l-2.4-5.2-5.4 2.2 2.2-5.4L1.2 12l5.2-2.4-2.2-5.4 5.4 2.2z" fill={COLORS.attack} stroke="#5a0f08" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M8 13.5l3-3 2 2 3-3" fill="none" stroke="#fff2d6" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'heroic':
      return (
        <svg {...common}>
          <path d="M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.3 3.6 1.5-7.1L1.8 9.2 9 8.4z" fill={COLORS.heroic} stroke="#6b4a00" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case 'wild':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill={COLORS.move} stroke="#1f3d0d" strokeWidth="1" />
          <rect x="12.5" y="2.5" width="9" height="9" rx="1.5" fill={COLORS.heroic} stroke="#6b4a00" strokeWidth="1" />
          <rect x="2.5" y="12.5" width="9" height="9" rx="1.5" fill={COLORS.attack} stroke="#5a0f08" strokeWidth="1" />
          <rect x="12.5" y="12.5" width="9" height="9" rx="1.5" fill="#fff" stroke="#444" strokeWidth="1" />
        </svg>
      );
    case 'thug':
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#c33" stroke="#5a0f08" strokeWidth="1.2" />
          <circle cx="12" cy="10" r="5" fill="#fbe7d5" />
          <path d="M7 10.2h10" stroke="#222" strokeWidth="2.6" />
          <path d="M4 22c1-4.5 4-6.5 8-6.5s7 2 8 6.5z" fill="#fbe7d5" />
        </svg>
      );
    case 'civilian':
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#5b8dd9" stroke="#1d3c6e" strokeWidth="1.2" />
          <circle cx="12" cy="9.5" r="4.6" fill="#fff" />
          <path d="M4 22c1-4.5 4-6.5 8-6.5s7 2 8 6.5z" fill="#fff" />
        </svg>
      );
    case 'crisis':
      return (
        <svg {...common}>
          <path d="M12 2l10 18H2z" fill="#f2a800" stroke="#6b3d00" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M12 8.5v5.5M12 16.5v1.5" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'bam':
      return (
        <svg {...common} viewBox="0 0 48 24" width={s * 2}>
          <path d="M6 12L1 5l7 2 2-6 4 5 5-4 1 6 7-2-3 6 6 3-7 2 3 6-7-2-2 6-4-5-5 4-1-6-7 2 3-6-6-3z" fill="#e63b2e" stroke="#fff" strokeWidth="1" />
          <text x="15" y="16" fontSize="11" fontWeight="900" fill="#fff" fontFamily="Impact, 'Arial Black', sans-serif">
            BAM!
          </text>
        </svg>
      );
    case 'threat':
      return (
        <svg {...common}>
          <path d="M12 2a8 8 0 0 0-8 8v4l2 2v3h12v-3l2-2v-4a8 8 0 0 0-8-8z" fill="#e8dff2" stroke="#4a2a6e" strokeWidth="1.2" />
          <circle cx="9" cy="11" r="1.8" fill="#4a2a6e" />
          <circle cx="15" cy="11" r="1.8" fill="#4a2a6e" />
          <path d="M9 16h6" stroke="#4a2a6e" strokeWidth="1.4" />
        </svg>
      );
    case 'villain':
      return (
        <svg {...common}>
          <path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6z" fill="#222" stroke="#000" strokeWidth="1" />
          <path d="M6 11l4 2 2 5 2-5 4-2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'health':
      return (
        <svg {...common}>
          <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z" fill="#d33" stroke="#600" strokeWidth="1.2" />
        </svg>
      );
    case 'enter':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="#f26b3a" stroke="#7a2a0a" strokeWidth="1.2" />
          <path d="M8 8l4 6 4-6M12 14v3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'ko':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="#e63b2e" stroke="#fff" strokeWidth="1.5" />
          <text x="4.5" y="16" fontSize="10" fontWeight="900" fill="#fff" fontFamily="Impact, 'Arial Black', sans-serif">
            KO
          </text>
        </svg>
      );
    case 'invulnerable':
      return (
        <svg {...common}>
          <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5bc0eb" stroke="#0d4a66" strokeWidth="1.3" />
          <circle cx="12" cy="11" r="3" fill="#fff" />
        </svg>
      );
  }
}

// "Distribute 2 {attack} tokens…" → text with inline icons.
export function CardText({ text, size = 14 }: { text: string; size?: number }): ReactNode {
  const parts = text.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{(\w+)\}$/.exec(p);
        if (m) return <Icon key={i} g={m[1] as Glyph} size={size} />;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function SymRow({ syms, size = 22 }: { syms: Sym[]; size?: number }) {
  if (!syms.length) return <span className="no-syms">no symbols</span>;
  return (
    <span className="symrow">
      {syms.map((s, i) => (
        <Icon key={i} g={s} size={size} />
      ))}
    </span>
  );
}
