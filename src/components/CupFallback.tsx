import { useId } from 'react';
import type { OrderStatus } from '@/lib/types';

const LEVEL: Record<OrderStatus, number> = { placed: 0.1, preparing: 0.55, ready: 1, completed: 1, cancelled: 0 };

/** Polished 2D cup tracker. Used when 3D is off or unavailable. */
export function CupFallback({ status, accent }: { status: OrderStatus; accent: string }) {
  const id = useId().replace(/:/g, '');
  const level = LEVEL[status];
  const top = 34 + (1 - level) * 118;
  return (
    <svg viewBox="0 0 200 200" width={220} height={220} role="img" aria-label={`Cup, ${status}`}>
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity=".8" />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF" stopOpacity=".32" />
          <stop offset=".4" stopColor="#FFF" stopOpacity=".05" />
          <stop offset="1" stopColor="#FFF" stopOpacity=".16" />
        </linearGradient>
        <clipPath id={`${id}c`}><path d="M52 30 L66 156 Q68 164 76 164 H124 Q132 164 134 156 L148 30 Z" /></clipPath>
      </defs>
      <ellipse cx="100" cy="176" rx="56" ry="7" fill="#000" opacity=".4" />
      <g clipPath={`url(#${id}c)`}>
        <rect x="40" y={top} width="120" height="150" fill={`url(#${id}l)`} style={{ transition: 'y 250ms ease' }} />
      </g>
      <path d="M52 30 L66 156 Q68 164 76 164 H124 Q132 164 134 156 L148 30 Z" fill={`url(#${id}g)`} stroke="#FFE6B4" strokeOpacity=".5" />
      <path d="M62 44 L73 148" stroke="#FFF" strokeOpacity=".45" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
