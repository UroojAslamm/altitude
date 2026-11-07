import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Skeleton } from '@/components/ui';
import { useAuth, type Role } from '@/lib/auth';
import { installAudioUnlock } from '@/lib/chime';
import { supabase } from '@/lib/supabase';
import { LoginPage, SignupPage } from '@/pages/Auth';
import { CartPage, CheckoutPage } from '@/pages/Cart';
import { HomePage } from '@/pages/Home';
import { ItemDetailPage, MenuPage } from '@/pages/Menu';
import { MePage } from '@/pages/Me';
import { OrdersPage, TrackerPage } from '@/pages/Orders';

const KitPage = lazy(() => import('@/pages/Kit'));
const BaristaPage = lazy(() => import('@/pages/Barista'));
const LandingPage = lazy(() => import('@/pages/Landing'));
const AdminPage = lazy(() => import('@/pages/Admin'));
const DemoPage = lazy(() => import('@/pages/Demo'));
const SquadPage = lazy(() => import('@/pages/Squad'));
const OffersPage = lazy(() => import('@/pages/Offers'));

function Loading() {
  return <div className="mx-auto max-w-md space-y-3 p-6"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>;
}

function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && (!profile || !roles.includes(profile.role))) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Root() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <LandingPage />;
  if (profile?.role === 'barista') return <Navigate to="/barista" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <HomePage />;
}

function OfflineNotice() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[80] border-b border-mango-400/50 bg-ink-800 p-2 text-center text-sm">
      You're offline. Orders need a connection. We'll reconnect when you're back.
    </div>
  );
}

function PerkIssuer() {
  const { session } = useAuth();
  const uid = session?.user.id;
  useEffect(() => {
    if (uid) void supabase.rpc('issue_perk_vouchers');
  }, [uid]);
  return null;
}

export default function App() {
  useEffect(installAudioUnlock, []);
  return (
    <BrowserRouter>
      <OfflineNotice />
      <PerkIssuer />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/barista" element={<RequireRole roles={['barista', 'admin']}><BaristaPage /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><AdminPage /></RequireRole>} />
          <Route path="/demo" element={<RequireRole roles={['admin']}><DemoPage /></RequireRole>} />
          <Route path="/kit" element={<RequireRole roles={['admin']}><KitPage /></RequireRole>} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Root />} />
            <Route path="/menu" element={<RequireRole><MenuPage /></RequireRole>} />
            <Route path="/menu/:itemId" element={<RequireRole><ItemDetailPage /></RequireRole>} />
            <Route path="/cart" element={<RequireRole><CartPage /></RequireRole>} />
            <Route path="/checkout" element={<RequireRole><CheckoutPage /></RequireRole>} />
            <Route path="/orders" element={<RequireRole><OrdersPage /></RequireRole>} />
            <Route path="/orders/:orderId" element={<RequireRole><TrackerPage /></RequireRole>} />
            <Route path="/squad" element={<RequireRole><SquadPage /></RequireRole>} />
            <Route path="/offers" element={<RequireRole><OffersPage /></RequireRole>} />
            <Route path="/me" element={<RequireRole><MePage /></RequireRole>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
