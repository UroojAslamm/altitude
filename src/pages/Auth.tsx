import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Logo, PhotoBackdrop } from '@/components/brand';
import { Button, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { env, supabase } from '@/lib/supabase';

const DEMO_STUDENT = 'student1@altitude.demo';
const DEMO_STAFF = [
  { label: 'Barista', email: 'barista@altitude.demo' },
  { label: 'Admin', email: 'admin@altitude.demo' },
];

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Add your name').max(60),
  email: z.string().trim().email('That email looks off'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

function homeFor(role?: string) {
  if (role === 'barista') return '/barista';
  if (role === 'admin') return '/admin';
  return '/';
}

function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PhotoBackdrop name="lounge" position="50% 40%" className="min-h-dvh">
      <div className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-5 flex justify-center drop-shadow-[0_0_18px_rgba(255,213,138,.45)]"><Logo size={96} /></div>
          <div className="glass gloss rounded-3xl p-6">
            <div className="relative">
              <h1 className="h1-gradient mb-4 text-center text-4xl">{title}</h1>
              {children}
            </div>
          </div>
        </div>
      </div>
    </PhotoBackdrop>
  );
}

/** Demo sign-in for judges, on both the log-in and sign-up pages. Root sends each role to its home. */
function DemoLogin() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!env.demoLogin || !env.demoPassword) return null;

  async function login(email: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: env.demoPassword });
    setBusy(false);
    if (err) setError('The demo account is not available right now.');
    else navigate('/', { replace: true });
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="brass-rule" />
      <Button variant="secondary" disabled={busy} className="w-full" onClick={() => void login(DEMO_STUDENT)}>Try as Student</Button>
      <Button variant="secondary" disabled={busy} className="w-full" aria-expanded={staff} onClick={() => setStaff(!staff)}>Try as Staff</Button>
      {staff && (
        <div className="grid grid-cols-2 gap-2">
          {DEMO_STAFF.map((d) => (
            <Button key={d.email} disabled={busy} onClick={() => void login(d.email)}>{d.label}</Button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-center text-sm text-berry-500">{error}</p>}
    </div>
  );
}

export function LoginPage() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && profile) return <Navigate to={homeFor(profile.role)} replace />;

  async function login(e: string, p: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: e, password: p });
    setBusy(false);
    if (err) setError("That email and password don't match.");
    else navigate('/', { replace: true });
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    void login(email.trim(), password);
  }

  return (
    <AuthFrame title="Welcome back">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" disabled={busy} className="w-full">Log in</Button>
      </form>
      <p className="mt-3 text-center text-sm text-cream-300">
        New here? <Link to="/signup" className="text-glow-300 underline">Start climbing</Link>
      </p>
      <DemoLogin />
    </AuthFrame>
  );
}

export function SignupPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setBusy(true);
    setErrors({});
    const domain = parsed.data.email.split('@')[1]?.toLowerCase() ?? '';
    const { data: domains } = await supabase.rpc('public_allowed_domains');
    if (Array.isArray(domains) && !domains.includes(domain)) {
      setErrors({ email: 'Use your RIT email' });
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName } },
    });
    setBusy(false);
    if (error) {
      const domainBlocked = /database error|EMAIL_DOMAIN/i.test(error.message);
      setErrors({ email: domainBlocked ? 'Use your RIT email' : error.message });
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <AuthFrame title="Start climbing">
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3" noValidate>
        <Field label="Full name" autoComplete="name" value={form.fullName} error={errors.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Field label="RIT email" type="email" autoComplete="email" value={form.email} error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" type="password" autoComplete="new-password" value={form.password} error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" disabled={busy} className="w-full">Create account</Button>
      </form>
      <p className="mt-3 text-center text-sm text-cream-300">
        Already climbing? <Link to="/login" className="text-glow-300 underline">Log in</Link>
      </p>
      <DemoLogin />
    </AuthFrame>
  );
}
