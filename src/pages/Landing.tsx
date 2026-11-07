import { Coffee, Mountain, Users } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
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
  if (!use3d) return <FlatLanding />;
  return (
    <ThreeBoundary fallback={<FlatLanding />}>
      <Suspense fallback={<FlatLanding />}>
        <Ascent features={<Features compact />} cta={<Cta />} socials={<PublicSocialButtons />} />
      </Suspense>
    </ThreeBoundary>
  );
}
