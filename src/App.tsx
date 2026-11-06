import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Button, Skeleton } from '@/components/ui';
import { useAuth, type Role } from '@/lib/auth';
import { LoginPage, SignupPage } from '@/pages/Auth';

const KitPage = lazy(() => import('@/pages/Kit'));

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

function Placeholder() {
  const { profile, signOut } = useAuth();
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="h1-gradient text-5xl">Hello {profile?.full_name}</h1>
        <Button variant="secondary" className="mt-4" onClick={() => void signOut()}>Log out</Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/kit" element={<RequireRole roles={['admin']}><KitPage /></RequireRole>} />
          <Route path="/" element={<RequireRole><Placeholder /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
