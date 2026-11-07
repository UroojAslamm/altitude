import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Minus, Plus, Star, X } from 'lucide-react';
import {
  createContext, useCallback, useContext, useEffect, useId, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes,
} from 'react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

export function Button({
  variant = 'primary', className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary glass',
        variant === 'ghost' && 'btn-ghost',
        variant === 'icon' && 'btn-secondary glass !w-11 !px-0',
        className,
      )}
    />
  );
}

export function Card({
  variant = 'glass', className, children,
}: { variant?: 'glass' | 'feature'; className?: string; children: ReactNode }) {
  return (
    <div className={cx('glass gloss rounded-2xl p-4', variant === 'feature' && 'hairline', className)}>
      <div className="relative">{children}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="tabular font-display text-3xl font-bold text-cream-50">{value}</div>
      <div className="text-sm text-cream-300">{label}</div>
    </div>
  );
}

export function ProgressRing({
  value, size = 96, children,
}: { value: number; size?: number; children?: ReactNode }) {
  const id = useId();
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E9C46A" />
            <stop offset=".5" stopColor="#FFF1C9" />
            <stop offset="1" stopColor="#D9A441" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,230,180,.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export type Tier = 'base_camp' | 'ridge' | 'summit' | 'peak';
export const TIER_LABEL: Record<Tier, string> = {
  base_camp: 'Base Camp', ridge: 'Ridge', summit: 'Summit', peak: 'Peak',
};

export function TierShield({ tier, size = 56 }: { tier: Tier; size?: number }) {
  const metal = {
    base_camp: 'metal-base-camp', ridge: 'metal-ridge', summit: 'metal-summit', peak: 'metal-peak',
  }[tier];
  return (
    <div
      role="img"
      aria-label={`${TIER_LABEL[tier]} tier`}
      className={cx('relative', tier === 'peak' && 'drop-shadow-[0_0_10px_rgba(255,213,138,.6)]')}
      style={{ width: size, height: size * 1.15 }}
    >
      <div className={cx('shield-clip absolute inset-0', tier === 'peak' ? 'brass' : metal)} />
      <div className={cx('shield-clip absolute', metal)} style={{ inset: tier === 'peak' ? 2 : 0 }} />
      <div
        className="shield-clip absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.4), rgba(255,255,255,0) 48%)' }}
      />
    </div>
  );
}

export function Chip({
  active, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className={cx(
        'min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors',
        active ? 'brass border-transparent text-ink-900' : 'glass text-cream-100',
        className,
      )}
    />
  );
}

export function Badge({
  tone = 'neutral', children,
}: { tone?: 'neutral' | 'success' | 'warning' | 'error' | 'brass'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-ink-700 text-cream-100',
    success: 'bg-leaf-500/25 text-[#BFE3AE]',
    warning: 'bg-mango-400/20 text-mango-400',
    error: 'bg-berry-500/20 text-[#FFB3B8]',
    brass: 'brass text-ink-900',
  };
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, label,
}: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="glass flex rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition-colors',
            value === o.value ? 'brass text-ink-900' : 'text-cream-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ink-700">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'min-h-[44px] whitespace-nowrap border-b-2 px-4 text-sm font-semibold',
            value === t.value ? 'border-glow-500 text-cream-50' : 'border-transparent text-cream-300',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label, min, max, step = 1, value, onChange, format,
}: {
  label: string; min: number; max: number; step?: number; value: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-sm text-cream-300">
        <span>{label}</span>
        <span className="tabular text-cream-50">{format ? format(value) : value}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-[#F5B14A]"
      />
    </label>
  );
}

export function Stepper({
  value, min = 1, max = 20, onChange, label,
}: { value: number; min?: number; max?: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="glass inline-flex items-center rounded-xl" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)}
        className="grid h-11 w-11 place-items-center disabled:opacity-40">
        <Minus size={20} strokeWidth={1.75} />
      </button>
      <span className="tabular w-8 text-center font-semibold" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)}
        className="grid h-11 w-11 place-items-center disabled:opacity-40">
        <Plus size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3.5 py-2.5 text-cream-50 placeholder:text-cream-300/70';

export function Field({
  label, error, ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-cream-300">{label}</span>
      <input {...rest} className={cx(inputClass, 'min-h-[44px]')} aria-invalid={Boolean(error)} />
      {error && <span role="alert" className="mt-1 block text-sm text-[#FFB3B8]">{error}</span>}
    </label>
  );
}

export function TextArea({
  label, maxLength, value, ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; value: string; maxLength: number }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-sm text-cream-300">
        <span>{label}</span>
        <span className="tabular">{value.length}/{maxLength}</span>
      </span>
      <textarea {...rest} value={value} maxLength={maxLength} rows={3} className={inputClass} />
    </label>
  );
}

export function Rating({
  value, onChange, size = 20,
}: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="inline-flex" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star size={size} strokeWidth={1.75} className={n <= Math.round(value) ? 'fill-mango-400 text-mango-400' : 'text-cream-300/50'} />
        );
        return onChange ? (
          <button key={n} type="button" aria-label={`${n} stars`} onClick={() => onChange(n)} className="grid h-11 w-11 place-items-center">
            {star}
          </button>
        ) : <span key={n}>{star}</span>;
      })}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({
  title, body, action,
}: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="glass gloss rounded-2xl p-8 text-center">
      <h3 className="relative text-2xl">{title}</h3>
      {body && <p className="relative mx-auto mt-2 max-w-sm text-cream-300">{body}</p>}
      {action && <div className="relative mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="That didn't load"
      body="Check your connection and try again."
      action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    />
  );
}

export function ConnectionDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-cream-300" role="status">
      <span className={cx('h-2.5 w-2.5 rounded-full', online ? 'bg-leaf-500' : 'bg-mango-400')} />
      {online ? 'Live' : 'Reconnecting'}
    </span>
  );
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
}

/** Bottom sheet on phone, side panel on desktop. */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEscape(open, onClose);
  // In a portal: a parent with overflow or a backdrop filter would otherwise clip it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-ink-950/70" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-[var(--hairline)] bg-ink-800 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-e3 lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[420px] lg:rounded-none"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl">{title}</h2>
              <Button variant="icon" aria-label="Close" onClick={onClose}><X size={20} strokeWidth={1.75} /></Button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEscape(open, onClose);
  // In a portal: a parent with overflow or a backdrop filter would otherwise clip it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/70 p-4"
          role="dialog" aria-modal="true" aria-label={title}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-ink-800 p-5 shadow-e3" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-2xl">{title}</h2>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface ToastItem { id: number; text: string; tone: 'info' | 'error' }
const ToastContext = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, text, tone }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] grid justify-items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className={cx('rounded-xl border px-4 py-2.5 text-sm shadow-e2', t.tone === 'error' ? 'border-berry-500/60 bg-[#3A1418] text-cream-50' : 'border-[var(--hairline)] bg-ink-800 text-cream-50')}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
