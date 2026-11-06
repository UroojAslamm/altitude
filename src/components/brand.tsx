import type { ReactNode } from 'react';
import photos from '@/lib/photos.json';
import { cx } from './ui';

export type PhotoName = 'counter' | 'lounge' | 'cup' | 'wall';

/** Traced symbol with a typeset wordmark. The 150px source is too small to trace the letters cleanly. */
export function Logo({ size = 72, tone = 'cream', className }: { size?: number; tone?: 'cream' | 'navy'; className?: string }) {
  return (
    <div className={cx('inline-flex flex-col items-center', className)} role="img" aria-label="Altitude">
      <span
        className={cx('font-display font-bold uppercase', tone === 'cream' ? 'text-cream-50' : 'text-navy-700')}
        style={{ fontSize: size * 0.34, letterSpacing: '.08em', lineHeight: 1.1 }}
      >
        Altitude
      </span>
      <img src={tone === 'cream' ? '/brand/logo-mark-cream.svg' : '/brand/logo-mark.svg'} alt="" style={{ width: size * 0.8 }} />
    </div>
  );
}

/** Responsive cafe photo with scrim. */
export function PhotoBackdrop({
  name, position = 'center', className, children,
}: { name: PhotoName; position?: string; className?: string; children?: ReactNode }) {
  const manifest = photos as Record<string, { blur: string } | undefined>;
  const resolved = manifest[name] ? name : 'lounge';
  const src = (ext: string) => [480, 960, 1600].map((w) => `/brand/photos/${resolved}-${w}.${ext} ${w}w`).join(', ');
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <picture>
        <source type="image/avif" srcSet={src('avif')} sizes="100vw" />
        <source type="image/webp" srcSet={src('webp')} sizes="100vw" />
        <img
          src={`/brand/photos/${resolved}-960.webp`} alt="" loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: position, backgroundImage: `url(${manifest[resolved]?.blur})`, backgroundSize: 'cover' }}
        />
      </picture>
      <div className="photo-scrim" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
