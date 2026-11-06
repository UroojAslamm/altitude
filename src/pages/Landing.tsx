import { Coffee, Mountain, Users } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo, PhotoBackdrop } from '@/components/brand';
import { can3d, ThreeBoundary } from '@/three/support';

const Ascent = lazy(() => import('@/three/Ascent'));

const FEATURES = [
  { icon: Coffee, title: 'Order ahead', body: 'Skip the line. Watch the queue live and get alerted when it is ready.' },
  { icon: Mountain, title: 'Climb tiers', body: 'Every dirham earns meters. Base Camp to Peak, with perks at each step.' },
  { icon: Users, title: 'Squad up', body: 'When a friend orders, you climb too. Clubs race for the Summit.' },
];

function Cta() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link to="/signup" className="btn btn-primary">Start climbing</Link>
      <Link to="/login" className="btn btn-secondary glass">Log in</Link>
    </div>
  );
}

function Features() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, body }) => (
        <div key={title} className="glass gloss hairline rounded-2xl p-5">
          <div className="relative">
            <Icon size={24} strokeWidth={1.75} className="text-glow-300" />
            <h2 className="mt-2 text-3xl">{title}</h2>
            <p className="text-cream-100">{body}</p>
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
        <Ascent features={<Features />} cta={<Cta />} />
      </Suspense>
    </ThreeBoundary>
  );
}
