import { useId } from 'react';

type Kind = 'hot' | 'iced' | 'smoothie' | 'shake' | 'bakery';

interface Props {
  kind: string;
  accent: string;
  name?: string;
  size?: number;
  imageUrl?: string | null;
}

/** Polished vector drink art. Light comes from the top left. */
export function DrinkArt({ kind, accent, name = '', size = 120, imageUrl }: Props) {
  const uid = useId().replace(/:/g, '');
  if (imageUrl) {
    return <img src={imageUrl} alt={name} width={size} height={size} className="rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  const k = kind as Kind;
  const isCroissant = k === 'bakery' && /croissant/i.test(name);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={name || 'Drink'}>
      <defs>
        <linearGradient id={`${uid}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity=".78" />
          <stop offset=".5" stopColor={accent} />
          <stop offset="1" stopColor="#000" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={`${uid}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".55" stopColor="#F3EBDD" />
          <stop offset="1" stopColor="#B9AE9C" />
        </linearGradient>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".42" />
          <stop offset=".3" stopColor="#FFFFFF" stopOpacity=".08" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".65" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}f`} cx=".38" cy=".3" r=".8">
          <stop offset="0" stopColor="#FFF9EE" />
          <stop offset="1" stopColor="#D9C8AC" />
        </radialGradient>
        <radialGradient id={`${uid}b`} cx=".35" cy=".3" r=".85">
          <stop offset="0" stopColor="#F6D79A" />
          <stop offset=".55" stopColor={accent} />
          <stop offset="1" stopColor="#6A4318" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="109" rx="34" ry="5" fill="#000" opacity=".38" />

      {k === 'hot' && (
        <g>
          <path d="M34 34 L41 104 Q42 108 47 108 H73 Q78 108 79 104 L86 34 Z" fill={`url(#${uid}c)`} />
          <rect x="30" y="24" width="60" height="11" rx="4" fill={`url(#${uid}c)`} stroke="#A69A87" strokeWidth=".6" />
          <ellipse cx="60" cy="25" rx="27" ry="3.4" fill={`url(#${uid}l)`} />
          <path d="M39 42 L44 100" stroke={`url(#${uid}s)`} strokeWidth="5" strokeLinecap="round" opacity=".8" />
          <image href="/brand/logo-mark.svg" x="45" y="56" width="30" height="24" />
          <path d="M37 88 L80.5 88" stroke={accent} strokeWidth="2.5" opacity=".75" />
        </g>
      )}

      {(k === 'iced' || k === 'smoothie') && (
        <g>
          <path d="M78 6 L68 34" stroke="#F5B14A" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M36 28 L43 104 Q44 108 49 108 H71 Q76 108 77 104 L84 28 Z" fill={`url(#${uid}g)`} stroke="#FFF" strokeOpacity=".34" />
          <path d="M38.5 40 L43.8 103 Q44.6 106 49 106 H71 Q75.4 106 76.2 103 L81.5 40 Z" fill={`url(#${uid}l)`} />
          {k === 'iced' ? (
            <g fill="#FFF" fillOpacity=".3" stroke="#FFF" strokeOpacity=".5">
              <rect x="46" y="44" width="14" height="14" rx="3" transform="rotate(-10 53 51)" />
              <rect x="62" y="50" width="13" height="13" rx="3" transform="rotate(14 68 56)" />
              <rect x="50" y="64" width="12" height="12" rx="3" transform="rotate(8 56 70)" />
            </g>
          ) : (
            <g>
              <ellipse cx="60" cy="40" rx="21.5" ry="3.4" fill={accent} />
              <ellipse cx="60" cy="40" rx="21.5" ry="3.4" fill="#FFF" opacity=".24" />
              <circle cx="82" cy="30" r="9" fill={accent} stroke="#FFF" strokeOpacity=".65" strokeWidth="1.5" />
              <path d="M82 21 V39 M73 30 H91" stroke="#FFF" strokeOpacity=".5" />
            </g>
          )}
          <path d="M41 34 L47 100" stroke={`url(#${uid}s)`} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}

      {k === 'shake' && (
        <g>
          <path d="M72 4 L64 30" stroke="#F5B14A" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M36 42 L43 104 Q44 108 49 108 H71 Q76 108 77 104 L84 42 Z" fill={`url(#${uid}l)`} />
          <path d="M36 42 L43 104 Q44 108 49 108 H71 Q76 108 77 104 L84 42 Z" fill={`url(#${uid}g)`} stroke="#FFF" strokeOpacity=".3" />
          <path d="M34 42 Q34 32 44 32 Q44 20 58 22 Q68 12 76 24 Q88 26 86 42 Z" fill={`url(#${uid}f)`} />
          <circle cx="60" cy="18" r="4.6" fill="#8E1B2C" />
          <circle cx="58.6" cy="16.6" r="1.3" fill="#FFF" opacity=".75" />
          <path d="M42 48 L47 100" stroke={`url(#${uid}s)`} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}

      {k === 'bakery' && isCroissant && (
        <g>
          <path d="M16 84 Q20 44 60 40 Q100 44 104 84 Q96 90 88 78 Q78 66 60 66 Q42 66 32 78 Q24 90 16 84 Z" fill={`url(#${uid}b)`} />
          <path d="M40 48 Q38 62 34 74 M60 40 V66 M80 48 Q82 62 86 74" stroke="#7A4A18" strokeOpacity=".55" strokeWidth="2.5" fill="none" />
          <path d="M28 62 Q40 46 60 45" stroke="#FFF" strokeOpacity=".55" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {k === 'bakery' && !isCroissant && (
        <g>
          <path d="M22 60 L84 38 L100 58 V92 L38 104 L22 88 Z" fill="#E9D8BC" />
          <path d="M38 76 L100 58 V92 L38 104 Z" fill={`url(#${uid}f)`} />
          <path d="M38 84 L100 67 M38 95 L100 79" stroke={accent} strokeWidth="5" />
          <path d="M22 60 L84 38 L100 58 L38 76 Z" fill={accent} />
          <path d="M22 60 L38 76 V104 L22 88 Z" fill="#CDB891" />
          <path d="M34 62 L76 47" stroke="#FFF" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
