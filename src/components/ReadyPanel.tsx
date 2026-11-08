import type { Order } from '@/lib/types';
import { Logo } from './brand';
import { Button } from './ui';

/** The one Ready alert, on the order page and on every other screen. */
export function ReadyPanel({ order, onDone, busy = false }: { order: Order; onDone: () => void; busy?: boolean }) {
  return (
    <div className="surface-obsidian fixed inset-0 z-50 grid place-items-center p-6 text-center" role="alertdialog" aria-label={`Ready, order ${order.order_no}`}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center drop-shadow-[0_0_18px_rgba(255,213,138,.5)]"><Logo size={96} /></div>
        <div className="glass gloss halo rounded-3xl p-8">
          <div className="relative">
            <p className="font-display text-7xl font-bold uppercase tracking-wider text-glow-300">Ready</p>
            <p className="tabular mt-2 text-2xl">Order #{order.order_no}</p>
            <p className="mt-2 text-cream-300">Collect it at the counter.</p>
            {order.prepared_by_name && <p className="text-cream-300">Prepared by {order.prepared_by_name}.</p>}
            <Button className="mt-6 w-full" disabled={busy} onClick={onDone}>I got it</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
