import { ChevronDown, Coffee, Mountain, Users } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo, PhotoBackdrop } from '@/components/brand';
import { PublicSocialButtons } from '@/components/SocialButtons';
import { cx } from '@/components/ui';
import { can3d, ThreeBoundary } from '@/three/support';

const Ascent = lazy(() => import('@/three/Ascent'));

const FEATURES = [
  { icon: Coffee, title: 'Order ahead', body: 'Skip the line. Watch the queue live and get alerted when it is ready.' },
  { icon: Mountain, title: 'Climb tiers', body: 'Every dirham earns meters. Base Camp to Peak, with perks at each step.' },
  { icon: Users, title: 'Squad up', body: 'When a friend orders, you climb too. Squads earn together.' },
];

function Cta() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link to="/signup" className="btn btn-primary">Start climbing</Link>
      <Link to="/login" className="btn btn-secondary glass">Log in</Link>
    </div>
  );
}

function Features({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cx('grid md:grid-cols-3', compact ? 'gap-2' : 'gap-4')}>
      {FEATURES.map(({ icon: Icon, title, body }) => (
        <div key={title} className={cx('glass gloss hairline rounded-2xl', compact ? 'p-3 text-center' : 'p-5')}>
          <div className="relative">
            <Icon size={compact ? 20 : 24} strokeWidth={1.75} className={cx('text-glow-300', compact && 'mx-auto')} />
            <h2 className={compact ? 'mt-1 text-xl' : 'mt-2 text-3xl'}>{title}</h2>
            <p className={cx('text-cream-100', compact && 'text-sm')}>{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** First screen only: tells a newcomer the page moves by scrolling. Gone after the first scroll. */
function ScrollCue() {
  const [top, setTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setTop(window.scrollY < 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      type="button"
      aria-label="Scroll down"
      tabIndex={top ? 0 : -1}
      onClick={(e) => { e.currentTarget.blur(); window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' }); }}
      // Sits above the Start climbing and Log in buttons on phones, and in the corner on wider screens.
      className={cx(
        'fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 flex-col md:bottom-8 md:left-auto md:right-8 md:translate-x-0 items-center gap-1 rounded-full px-4 py-1 text-cream-50',
        !top && 'pointer-events-none',
      )}
      style={{ opacity: top ? 1 : 0, visibility: top ? 'visible' : 'hidden', transition: `opacity 400ms ease, visibility 0s linear ${top ? '0s' : '400ms'}` }}
    >
      <span className="scroll-cue flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] [text-shadow:0_1px_8px_rgba(0,0,0,.8)]">Scroll down</span>
        <ChevronDown size={26} strokeWidth={2} className="text-glow-300 drop-shadow-[0_1px_6px_rgba(0,0,0,.8)]" />
      </span>
    </button>
  );
}

/** Refined 2D landing. Also the fallback for The Ascent. */
function FlatLanding() {
  return (
    <div>
      <PhotoBackdrop name="lounge" position="50% 35%" className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh max-w-[1200px] flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="drop-shadow-[0_0_18px_rgba(255,213,138,.5)]"><Logo size={120} /></div>
          <h1 className="h1-gradient text-6xl md:text-8xl">Elevate your experiences</h1>
          <p className="max-w-md text-lg text-cream-100">The Altitude app for RIT Dubai. Order ahead, earn meters, reach the Peak.</p>
          <Cta />
        </div>
      </PhotoBackdrop>
      <div className="brass-rule" />
      <section className="mx-auto max-w-[1200px] space-y-8 p-6 py-12">
        <Features />
        <PhotoBackdrop name="counter" position="70% 45%" className="h-72 rounded-3xl">
          <div className="flex h-full items-end p-6"><h2 className="text-4xl">Every order is a step up.</h2></div>
        </PhotoBackdrop>
        <PhotoBackdrop name="cup" position="50% 50%" className="h-72 rounded-3xl">
          <div className="flex h-full items-end p-6"><h2 className="text-4xl">Earn meters. Climb tiers.</h2></div>
        </PhotoBackdrop>
        <Cta />
        <PublicSocialButtons />
      </section>
    </div>
  );
}

export default function LandingPage() {
  const [use3d] = useState(can3d);
  if (!use3d) return <><FlatLanding /><ScrollCue /></>;
  return (
    <>
      <ThreeBoundary fallback={<FlatLanding />}>
        <Suspense fallback={<FlatLanding />}>
          <Ascent features={<Features compact />} cta={<Cta />} socials={<PublicSocialButtons />} />
        </Suspense>
      </ThreeBoundary>
      <ScrollCue />
    </>
  );
}
