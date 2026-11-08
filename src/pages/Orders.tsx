import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page, PageHeader } from '@/components/AppShell';
import { PrepVisual } from '@/components/PrepVisual';
import { ReadyPanel } from '@/components/ReadyPanel';
import {
  Badge, Button, Card, Chip, cx, EmptyState, ErrorState, Modal, Rating, Skeleton, TextArea, TIER_LABEL, TierShield, useToast, type Tier,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { pickedUp } from '@/lib/pickedUp';
import { useMenu, useMyOrders, useOrder, useQueueInfo, useRealtime } from '@/lib/queries';
import { aed, dubaiDate, dubaiTime, etaLabel, friendlyError, prepItem } from '@/lib/rules';
import { payments } from '@/lib/payment';
import { supabase } from '@/lib/supabase';
import type { MeterBreakdown, Order, OrderStatus } from '@/lib/types';

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

const TIPS = [200, 500, 1000];

/** Who is making the order, with an optional tip once a barista has picked it up. */
function BaristaCard({ order }: { order: Order }) {
  const toast = useToast();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const name = order.prepared_by_name;
  if (!name) return null;

  async function tip(fils: number) {
    setBusy(true);
    if (order.payment_status === 'paid') await payments.charge(fils, order.id);
    const { error } = await supabase.rpc('tip_order', { p_order_id: order.id, p_tip_fils: fils });
    toast(error ? friendlyError(error.message) : `Thanks. ${name} got your tip.`, error ? 'error' : 'info');
    await client.invalidateQueries({ queryKey: ['order', order.id] });
    setBusy(false);
  }

  return (
    <Card>
      <p className="text-lg" data-testid="prepared-by">{order.status === 'preparing' ? `${name} is preparing your order` : `Prepared by ${name}`}</p>
      {order.tip_fils > 0 ? <p className="tabular text-sm text-cream-300">You tipped {aed(order.tip_fils)}. Thank you.</p> : (
        <>
          <p className="mb-2 text-sm text-cream-300">Want to tip {name}? It's optional.</p>
          <div className="flex flex-wrap gap-2">
            {TIPS.map((t) => <Chip key={t} active={false} disabled={busy} onClick={() => void tip(t)}>{aed(t)}</Chip>)}
          </div>
        </>
      )}
    </Card>
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
  const client = useQueryClient();
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
            void client.invalidateQueries({ queryKey: ['reviews', first.menu_item_id] });
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
  const [done, setDone] = useState(false);
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

  useEffect(() => {
    const original = 'ASCEND by Altitude';
    document.title = status === 'ready' && order.data ? `READY #${order.data.order_no}` : original;
    return () => { document.title = original; };
  }, [status, order.data]);

  async function complete() {
    if (orderId) pickedUp.add(orderId);
    setDone(true);
    const { error } = await supabase.rpc('complete_order', { p_order_id: orderId });
    if (error) {
      if (orderId) pickedUp.delete(orderId);
      setDone(false);
      toast(friendlyError(error.message), 'error');
    }
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
  const shown = prepItem(o.order_items ?? [], menu.data?.items ?? []);

  return (
    <>
      {o.status === 'ready' && !done && !pickedUp.has(o.id) && <ReadyPanel order={o} onDone={() => void complete()} />}
      <PageHeader title={`Order #${o.order_no}`} subtitle={o.status === 'cancelled' ? 'Cancelled' : undefined} />
      <Page className="lg:max-w-2xl">
        {o.status !== 'cancelled' && <Card><StatusStepper status={o.status} /></Card>}
        {active && (
          <p aria-live="polite" className="text-center text-lg" data-testid="queue">
            {queue.data ? `${queue.data.ahead_count} ahead of you, ${etaLabel(queue.data.eta_seconds)}` : 'Checking the queue'}
          </p>
        )}
        {active && (menu.isLoading ? <Skeleton className="mx-auto h-60 w-56" /> : (
          <PrepVisual
            kind={shown?.item?.kind ?? 'hot'}
            accent={shown?.item?.accent_color ?? '#C99A5B'}
            name={shown?.line.name_snapshot ?? 'Your order'}
            imageUrl={shown?.item?.image_url}
            more={(o.order_items?.length ?? 1) - 1}
          />
        ))}
        <BaristaCard order={o} />
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
  const orders = useMyOrders(uid, 10);
  const client = useQueryClient();
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

  async function hide(o: Order) {
    const { error } = await supabase.rpc('hide_order', { p_order_id: o.id });
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['orders'] });
  }

  return (
    <>
      <PageHeader title="Orders" subtitle="Your last 10 orders" />
      <Page className="lg:max-w-2xl">
        {orders.isLoading && <Skeleton className="h-40" />}
        {orders.isError && <ErrorState onRetry={() => void orders.refetch()} />}
        {orders.data?.length === 0 && <EmptyState title="No orders yet" body="Your first climb starts with one coffee." action={<Link to="/menu" className="btn btn-primary">Browse menu</Link>} />}
        {orders.data?.map((o) => (
          <Card key={o.id}>
            <div className="flex items-start gap-2">
              <Link to={`/orders/${o.id}`} className="block min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="tabular font-display text-2xl font-bold">#{o.order_no}</span>
                  <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                </div>
                <p className="truncate text-sm text-cream-300">{o.order_items?.map((l) => l.name_snapshot).join(', ')}</p>
                <p className="tabular text-sm text-cream-300">{dubaiDate(o.placed_at)}, {dubaiTime(o.placed_at)} · {aed(o.total_fils)}</p>
              </Link>
              {(o.status === 'completed' || o.status === 'cancelled') && (
                <Button variant="icon" aria-label={`Remove order ${o.order_no} from history`} onClick={() => void hide(o)}><X size={20} strokeWidth={1.75} /></Button>
              )}
            </div>
            {o.status === 'completed' && <Button variant="secondary" className="mt-2 w-full" onClick={() => reorder(o)}>Order again</Button>}
          </Card>
        ))}
      </Page>
    </>
  );
}
