import { Coffee, House, ReceiptText, ShoppingBag, User, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { Logo, PhotoBackdrop, type PhotoName } from './brand';
import { cx } from './ui';

const TABS = [
  { to: '/', label: 'Home', icon: House },
  { to: '/menu', label: 'Menu', icon: Coffee },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/squad', label: 'Squad', icon: Users },
  { to: '/me', label: 'Me', icon: User },
];

function CartButton() {
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  if (count === 0) return null;
  return (
    <Link
      to="/cart"
      aria-label={`Cart, ${count} items`}
      className="btn btn-primary fixed bottom-[calc(var(--tab-h)+1.5rem+env(safe-area-inset-bottom))] right-4 z-30 lg:bottom-6 lg:right-6"
    >
      <ShoppingBag size={20} strokeWidth={1.75} />
      <span className="tabular">{count}</span>
    </Link>
  );
}

export function AppShell() {
  const { session } = useAuth();
  if (!session) return <Outlet />;
  return (
    <div className="min-h-dvh lg:pl-60">
      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex h-[var(--tab-h)] items-center justify-around rounded-2xl lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-60 lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:rounded-none lg:p-4"
      >
        <Link to="/" className="mb-6 hidden justify-center pt-2 lg:flex"><Logo size={92} /></Link>
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-medium lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:text-sm',
                isActive ? 'text-glow-300 lg:bg-white/5' : 'text-cream-300',
              )
            }
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="pb-[calc(var(--tab-h)+2rem+env(safe-area-inset-bottom))] lg:pb-8">
        <Outlet />
      </main>
      <CartButton />
    </div>
  );
}

export function PageHeader({
  title, subtitle, photo, position, children,
}: { title: string; subtitle?: string; photo?: PhotoName; position?: string; children?: ReactNode }) {
  const body = (
    <div className="mx-auto flex h-full max-w-[1200px] flex-col justify-end gap-1 px-4 pb-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="h1-gradient text-5xl">{title}</h1>
      {subtitle && <p className="text-cream-100">{subtitle}</p>}
      {children}
    </div>
  );
  if (!photo) return body;
  return <PhotoBackdrop name={photo} position={position} className="min-h-[180px]">{body}</PhotoBackdrop>;
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto max-w-[1200px] space-y-5 px-4 py-4', className)}>{children}</div>;
}
