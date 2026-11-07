import { useId, type CSSProperties } from 'react';
import { DrinkArt } from './DrinkArt';

interface Props {
  kind: string;
  accent: string;
  name: string;
  imageUrl?: string | null;
  more: number;
}

const FLOOR = 198;
const FULL = 0.92;
const MUG = 'M54 86 L66 190 Q67 198 76 198 H124 Q133 198 134 190 L146 86 Z';
const GLASS = 'M60 52 L72 192 Q73 198 82 198 H118 Q127 198 128 192 L140 52 Z';
const SURFACE = 'M0 6 Q10 0 20 6 T40 6 T60 6 T80 6 T100 6 T120 6 T140 6 T160 6 T180 6 T200 6 T220 6 T240 6 V170 H0 Z';

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g className="prep-reveal" fill="none" stroke="#FFF7E8" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round">
      <path className="prep-steam" d={`M${x - 14} ${y} q-7 -10 0 -20 q7 -10 0 -20`} />
      <path className="prep-steam prep-steam-late" d={`M${x + 14} ${y} q7 -10 0 -20 q-7 -10 0 -20`} />
    </g>
  );
}

/** Food has nothing to fill, so it appears from the bottom up. */
function FoodPrep({ accent, kind, name, imageUrl }: { accent: string; kind: string; name: string; imageUrl?: string | null }) {
  const art = <DrinkArt kind={kind} accent={accent} name={name} imageUrl={imageUrl} size={180} />;
  return (
    <div className="relative h-[180px] w-[180px]">
      <div className="absolute inset-0 opacity-25 grayscale" aria-hidden="true">{art}</div>
      <div className="prep-food absolute inset-0">{art}</div>
    </div>
  );
}

function DrinkPrep({ kind, accent }: { kind: string; accent: string }) {
  const id = useId().replace(/:/g, '');
  const mug = kind === 'hot';
  const body = mug ? MUG : GLASS;
  const full = FLOOR - FULL * (FLOOR - (mug ? 86 : 52));
  const thick = kind === 'shake' || kind === 'smoothie';
  return (
    <svg viewBox="0 0 200 220" width={220} height={242} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF" stopOpacity=".3" />
          <stop offset=".4" stopColor="#FFF" stopOpacity=".05" />
          <stop offset="1" stopColor="#FFF" stopOpacity=".16" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFE6B4" />
          <stop offset=".5" stopColor="#C99A5B" />
          <stop offset="1" stopColor="#7A5A2C" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".42" />
        </linearGradient>
        <clipPath id={`${id}c`}><path d={body} /></clipPath>
      </defs>
      <ellipse cx="100" cy="207" rx="56" ry="7" fill="#000" opacity=".4" />

      <rect x="80" y="4" width="40" height="14" rx="3" fill={`url(#${id}b)`} />
      <path d="M92 18 H108 L105 32 H95 Z" fill={`url(#${id}b)`} />
      <g className="prep-pour">
        <path className="prep-flow" d={`M100 32 V${FLOOR - 8}`} stroke={accent} strokeWidth={thick ? 9 : 5} strokeDasharray="26 3" />
      </g>

      {mug && <path d="M146 106 Q172 106 170 136 Q168 164 138 168" fill="none" stroke="#FFE6B4" strokeOpacity=".5" strokeWidth="7" />}
      {!mug && kind !== 'shake' && <path className="prep-reveal" d="M130 14 L114 190" stroke="#F5B14A" strokeWidth="4" strokeLinecap="round" />}

      <g clipPath={`url(#${id}c)`}>
        <g className="prep-fill" style={{ '--prep-from': `${FLOOR}px`, '--prep-to': `${full}px` } as CSSProperties}>
          <path className="prep-wave" d={SURFACE} fill={accent} />
          <rect y="4" width="200" height="170" fill={`url(#${id}d)`} />
          {kind === 'iced' && (
            <g fill="#FFF" fillOpacity=".3" stroke="#FFF" strokeOpacity=".55">
              <rect x="78" y="-2" width="17" height="17" rx="4" transform="rotate(-10 86 6)" />
              <rect x="103" y="3" width="16" height="16" rx="4" transform="rotate(14 111 11)" />
              <rect x="90" y="22" width="15" height="15" rx="4" transform="rotate(8 97 29)" />
            </g>
          )}
        </g>
      </g>

      <path d={body} fill={`url(#${id}w)`} stroke="#FFE6B4" strokeOpacity=".5" />
      <path d={mug ? 'M64 100 L74 182' : 'M70 66 L80 182'} stroke="#FFF" strokeOpacity=".4" strokeWidth="6" strokeLinecap="round" />

      {kind === 'shake' && (
        <g transform={`translate(0 ${full - 60})`}>
          <g className="prep-reveal">
            <path d="M58 58 Q58 44 72 44 Q74 28 94 31 Q108 18 120 34 Q140 36 142 58 Z" fill="#FFF3E0" />
            <circle cx="112" cy="27" r="6" fill="#8E1B2C" />
          </g>
        </g>
      )}
      {kind === 'smoothie' && <circle className="prep-reveal" cx="139" cy="46" r="12" fill={accent} stroke="#FFF" strokeOpacity=".65" strokeWidth="1.5" />}
      {mug && <Steam x={100} y={78} />}
    </svg>
  );
}

/** The ordered item being made, on a calm repeating loop from the moment the order is placed. */
export function PrepVisual({ kind, accent, name, imageUrl, more }: Props) {
  return (
    <figure className="grid place-items-center gap-2" data-testid="prep-visual" data-kind={kind} role="img" aria-label={`${name} being prepared`}>
      {kind === 'bakery'
        ? <FoodPrep accent={accent} kind={kind} name={name} imageUrl={imageUrl} />
        : <DrinkPrep kind={kind} accent={accent} />}
      <figcaption className="text-sm text-cream-300">{name}{more > 0 ? ` + ${more} more` : ''}</figcaption>
    </figure>
  );
}
