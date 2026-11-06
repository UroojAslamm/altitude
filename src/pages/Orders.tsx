import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page, PageHeader } from '@/components/AppShell';
import { CupFallback } from '@/components/CupFallback';
import { Logo } from '@/components/brand';
import {
  Badge, Button, Card, cx, EmptyState, ErrorState, Modal, Rating, Skeleton, TextArea, TIER_LABEL, TierShield, useToast, type Tier,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { playChime } from '@/lib/chime';
import { useMenu, useMyOrders, useOrder, useQueueInfo, useRealtime } from '@/lib/queries';
import { aed, dubaiDate, dubaiTime, etaLabel, friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { MeterBreakdown, Order, OrderStatus } from '@/lib/types';
import { can3d, ThreeBoundary } from '@/three/support';

const CupTracker = lazy(() => import('@/three/CupTracker'));

const STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: 'placed', label: 'Placed' }, { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' }, { status: 'completed', label: 'Picked up' },
];

function StatusStepper({ status }: { status: OrderStatus }) {
  const index = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-center justify-between" aria-label="Order progress">
      {STEPS.map((s, i) => (
        <li key={s.status} className="flex flex-1 flex-col items-center gap-1 text-center text-xs" aria-current={i === index ? 'step' : undefined}>
          <span className={cx('grid h-8 w-8 place-items-center rounded-full transition-colors', i <= index ? 'brass text-ink-900' : 'bg-ink-700 text-cream-300')}>
            {i < index ? <Check size={16} strokeWidth={2} /> : <span className="tabular font-semibold">{i + 1}</span>}
          </span>
          <span className={i <= index ? 'text-cream-50' : 'text-cream-300'}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function ReadyPanel({ order, onDone }: { order: Order; onDone: () => void }) {
  return (
    <div className="surface-obsidian fixed inset-0 z-50 grid place-items-center p-6 text-center" role="alertdialog" aria-label={`Ready, order ${order.order_no}`}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center drop-shadow-[0_0_18px_rgba(255,213,138,.5)]"><Logo size={96} /></div>
        <div className="glass gloss halo rounded-3xl p-8">
          <div className="relative">
            <p className="font-display text-7xl font-bold uppercase tracking-wider text-glow-300">Ready</p>
            <p className="tabular mt-2 text-2xl">Order #{order.order_no}</p>
            <p className="mt-2 text-cream-300">Collect it at the counter.</p>
            <Button className="mt-6 w-full" onClick={onDone}>I got it</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Earned({ breakdown, order }: { breakdown: MeterBreakdown; order: Order }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setShown(Math.round(breakdown.earned * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [breakdown.earned]);
  const tier = breakdown.tier_after as Tier;
  return (
    <Card variant="feature" className={breakdown.tier_changed ? 'halo' : undefined}>
      <div className="flex items-center gap-4">
        <TierShield tier={tier} size={52} />
        <div>
          <div className="tabular font-display text-4xl font-bold" data-testid="meters-earned">+{shown} m</div>
          <div className="text-sm text-cream-300">{breakdown.total_meters} m total</div>
        </div>
      </div>
      <dl className="tabular mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Base</dt><dd>{breakdown.base} m</dd></div>
        {breakdown.multiplier > 1 && <div className="flex justify-between text-glow-300"><dt>Common Hour</dt><dd>{breakdown.multiplier}x</dd></div>}
        {breakdown.squad_bonus_shared > 0 && <div className="flex justify-between"><dt>Shared with your squad</dt><dd>+{breakdown.squad_bonus_shared} m</dd></div>}
      </dl>
      {breakdown.tier_changed && <p className="mt-2 font-semibold text-glow-300">You reached {TIER_LABEL[tier]}.</p>}
      <RateDrink order={order} />
    </Card>
  );
}

function RateDrink({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const toast = useToast();
  const first = order.order_items?.[0];
  if (!first) return null;
  return (
    <>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => setOpen(true)}>Rate your drink</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Rate ${first.name_snapshot}`}>
        <Rating value={rating} onChange={setRating} />
        <div className="my-3"><TextArea label="Comment" maxLength={280} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <Button
          className="w-full"
          onClick={async () => {
            const { error } = await supabase.rpc('submit_review', { p_item_id: first.menu_item_id, p_rating: rating, p_body: body });
            toast(error ? friendlyError(error.message) : 'Thanks for the review', error ? 'error' : 'info');
            setOpen(false);
          }}
        >
          Submit
        </Button>
      </Modal>
    </>
  );
}

export function TrackerPage() {
  const { orderId } = useParams();
  const { session } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const menu = useMenu();
  const status = order.data?.status;
  const active = status === 'placed' || status === 'preparing';
  const queue = useQueueInfo(orderId, active);
  const uid = session?.user.id;
  useRealtime(
    [
      { table: 'orders', filter: `id=eq.${orderId}`, keys: [['order', orderId ?? ''], ['queue', orderId ?? '']] },
    ],
    `order-${orderId}`,
  );

  const previous = useRef<OrderStatus | undefined>(undefined);
  useEffect(() => {
    if (status === 'ready' && previous.current && previous.current !== 'ready') {
      playChime();
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }
    previous.current = status;
    const original = 'ASCEND by Altitude';
    document.title = status === 'ready' && order.data ? `READY #${order.data.order_no}` : original;
    return () => { document.title = original; };
  }, [status, order.data]);

  async function complete() {
    const { error } = await supabase.rpc('complete_order', { p_order_id: orderId });
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['order', orderId] });
    void client.invalidateQueries({ queryKey: ['profile', uid] });
    void client.invalidateQueries({ queryKey: ['orders'] });
  }

  async function cancel() {
    const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId, p_reason: 'Cancelled by student' });
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['order', orderId] });
  }

  if (order.isLoading) return <Page><Skeleton className="h-72" /></Page>;
  if (order.isError || !order.data) return <Page><ErrorState onRetry={() => void order.refetch()} /></Page>;
  const o = order.data;
  const firstItem = menu.data?.items.find((i) => i.id === o.order_items?.[0]?.menu_item_id);
  const accent = firstItem?.accent_color ?? '#C99A5B';

  return (
    <>
      {o.status === 'ready' && <ReadyPanel order={o} onDone={() => void complete()} />}
      <PageHeader title={`Order #${o.order_no}`} subtitle={o.status === 'cancelled' ? 'Cancelled' : undefined} />
      <Page className="lg:max-w-2xl">
        {o.status !== 'cancelled' && <Card><StatusStepper status={o.status} /></Card>}
        {active && (
          <p aria-live="polite" className="text-center text-lg" data-testid="queue">
            {queue.data ? `${queue.data.ahead_count} ahead of you, ${etaLabel(queue.data.eta_seconds)}` : 'Checking the queue'}
          </p>
        )}
        {o.status !== 'completed' && o.status !== 'cancelled' && (
          <div className="grid place-items-center">
            {can3d() ? (
              <ThreeBoundary fallback={<CupFallback status={o.status} accent={accent} />}>
                <Suspense fallback={<CupFallback status={o.status} accent={accent} />}>
                  <CupTracker status={o.status} accent={accent} ahead={queue.data?.ahead_count ?? 0} preparingAt={o.preparing_at} />
                </Suspense>
              </ThreeBoundary>
            ) : <CupFallback status={o.status} accent={accent} />}
          </div>
        )}
        {o.status === 'completed' && o.meter_breakdown && <Earned breakdown={o.meter_breakdown} order={o} />}
        <Card>
          <ul className="space-y-1">
            {o.order_items?.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="min-w-0">{l.qty} x {l.name_snapshot}
                  {l.options_snapshot.length > 0 && <span className="block truncate text-sm text-cream-300">{l.options_snapshot.map((x) => x.name).join(', ')}</span>}
                </span>
                <span className="tabular">{aed(l.unit_price_fils * l.qty)}</span>
              </li>
            ))}
          </ul>
          {o.discount_fils > 0 && <div className="mt-2 flex justify-between text-sm text-glow-300"><span>{o.discount_label}</span><span className="tabular">-{aed(o.discount_fils)}</span></div>}
          <div className="brass-rule my-2" />
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular">{aed(o.total_fils)}</span></div>
          {o.notes && <p className="mt-2 break-words text-sm text-glow-300">{o.notes}</p>}
        </Card>
        {o.status === 'placed' && <Button variant="secondary" className="w-full" onClick={() => void cancel()}>Cancel order</Button>}
        {(o.status === 'completed' || o.status === 'cancelled') && <Button variant="secondary" className="w-full" onClick={() => navigate('/menu')}>Back to menu</Button>}
      </Page>
    </>
  );
}

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'error' | 'brass'> = {
  placed: 'warning', preparing: 'warning', ready: 'brass', completed: 'success', cancelled: 'error',
};

export function OrdersPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const orders = useMyOrders(uid);
  const add = useCart((s) => s.add);
  const menu = useMenu();
  const toast = useToast();
  useRealtime([{ table: 'orders', filter: `user_id=eq.${uid}`, keys: [['orders']] }], `orders-${uid}`);

  function reorder(o: Order) {
    let added = 0;
    for (const l of o.order_items ?? []) {
      const item = menu.data?.items.find((i) => i.id === l.menu_item_id);
      if (!item?.is_available) continue;
      added += 1;
      add({
        itemId: item.id, name: item.name, kind: item.kind, accent: item.accent_color, unitFils: l.unit_price_fils, qty: l.qty,
        optionIds: l.options_snapshot.map((x) => x.id), optionNames: l.options_snapshot.map((x) => x.name),
      });
    }
    toast(added ? 'Added to cart' : "Those items aren't available now", added ? 'info' : 'error');
  }

  return (
    <>
      <PageHeader title="Orders" />
      <Page className="lg:max-w-2xl">
        {orders.isLoading && <Skeleton className="h-40" />}
        {orders.isError && <ErrorState onRetry={() => void orders.refetch()} />}
        {orders.data?.length === 0 && <EmptyState title="No orders yet" body="Your first climb starts with one coffee." action={<Link to="/menu" className="btn btn-primary">Browse menu</Link>} />}
        {orders.data?.map((o) => (
          <Card key={o.id}>
            <Link to={`/orders/${o.id}`} className="block">
              <div className="flex items-center justify-between">
                <span className="tabular font-display text-2xl font-bold">#{o.order_no}</span>
                <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
              </div>
              <p className="truncate text-sm text-cream-300">{o.order_items?.map((l) => l.name_snapshot).join(', ')}</p>
              <p className="tabular text-sm text-cream-300">{dubaiDate(o.placed_at)}, {dubaiTime(o.placed_at)} · {aed(o.total_fils)}</p>
            </Link>
            {o.status === 'completed' && <Button variant="secondary" className="mt-2 w-full" onClick={() => reorder(o)}>Order again</Button>}
          </Card>
        ))}
      </Page>
    </>
  );
}
