import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Volume2 } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SoundSettings } from '@/components/SoundSettings';
import {
  Badge, Button, ConnectionDot, cx, Field, Modal, Sheet, Skeleton, Stat, useToast,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { playAlert } from '@/lib/chime';
import { useMenu, useRealtime } from '@/lib/queries';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const age = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

const OrderCard = memo(function OrderCard({
  order, now, act, onCancel,
}: { order: Order; now: number; act: (fn: string, args: object) => void; onCancel: (o: Order) => void }) {
  const stale = order.status === 'ready' && order.ready_at !== null && age(order.ready_at, now) >= 15;
  const id = { p_order_id: order.id };
  return (
    <article data-testid={`order-${order.order_no}`} className={cx('glass gloss rounded-2xl p-4', stale && 'border-mango-400')}>
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="tabular font-display text-5xl font-bold leading-none">#{order.order_no}</div>
            <div className="text-lg">{order.customer_name}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="tabular text-sm text-cream-300">{age(order.placed_at, now)} min</span>
            <Badge tone={order.payment_status === 'paid' ? 'success' : 'warning'}>{order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</Badge>
            <Badge>{order.dine_in ? 'Dine in' : 'Take away'}</Badge>
          </div>
        </div>
        <ul className="mt-2 space-y-1">
          {order.order_items?.map((l) => (
            <li key={l.id}>
              <span className="font-semibold">{l.qty} x {l.name_snapshot}</span>
              {l.options_snapshot.length > 0 && <span className="block text-sm text-cream-300">{l.options_snapshot.map((o) => o.name).join(', ')}</span>}
            </li>
          ))}
        </ul>
        {order.notes && <p className="brass mt-2 break-words rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-900">{order.notes}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {order.status === 'placed' && <Button className="flex-1" onClick={() => act('advance_order', { ...id, p_to_status: 'preparing' })}>Start</Button>}
          {order.status === 'preparing' && <Button className="flex-1" onClick={() => act('advance_order', { ...id, p_to_status: 'ready' })}>Ready</Button>}
          {order.status === 'ready' && <Button className="flex-1" onClick={() => act('complete_order', id)}>Picked up</Button>}
          {order.status !== 'placed' && <Button variant="secondary" onClick={() => act('undo_order', id)}>Undo</Button>}
          <Button variant="ghost" onClick={() => onCancel(order)}>Cancel</Button>
        </div>
      </div>
    </article>
  );
});

function Switchboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const menu = useMenu();
  const client = useQueryClient();
  const [q, setQ] = useState('');
  const list = (menu.data?.items ?? []).filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title="Sold out">
      <Field label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-3 space-y-1">
        {list.map((i) => (
          <li key={i.id} className="flex min-h-[44px] items-center justify-between">
            <span>{i.name}</span>
            <button
              type="button" role="switch" aria-checked={i.is_available} aria-label={`${i.name} available`}
              onClick={async () => {
                await supabase.rpc('set_item_available', { p_item_id: i.id, p_available: !i.is_available });
                void client.invalidateQueries({ queryKey: ['menu'] });
              }}
              className={cx('h-9 w-24 rounded-full text-sm font-semibold', i.is_available ? 'bg-leaf-500/30 text-[#BFE3AE]' : 'bg-berry-500/30 text-[#FFB3B8]')}
            >
              {i.is_available ? 'Available' : 'Sold out'}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export default function BaristaPage() {
  const { signOut, profile } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const now = useNow();
  const [sound, setSound] = useState(false);
  const [board, setBoard] = useState(false);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [reason, setReason] = useState('');

  const orders = useQuery({
    queryKey: ['barista-orders'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*, order_items(*)')
        .in('status', ['placed', 'preparing', 'ready']).order('placed_at');
      if (error) throw new Error(error.message);
      return data as Order[];
    },
  });
  const stats = useQuery({
    queryKey: ['barista-stats'],
    refetchInterval: 30_000,
    queryFn: async () => (await supabase.rpc('barista_stats')).data as { orders_today: number },
  });
  const online = useRealtime(
    [
      { table: 'orders', keys: [['barista-orders'], ['barista-stats']] },
      { table: 'menu_items', keys: [['menu']] },
    ],
    'barista-live',
  );

  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!orders.data) return;
    const ids = new Set(orders.data.map((o) => o.id));
    if (seen.current && orders.data.some((o) => !seen.current!.has(o.id) && o.status === 'placed')) playAlert('new_order');
    seen.current = ids;
  }, [orders.data]);

  const columns = useMemo(() => {
    const by = (s: OrderStatus) => (orders.data ?? []).filter((o) => o.status === s);
    return [{ title: 'New', list: by('placed') }, { title: 'Preparing', list: by('preparing') }, { title: 'Ready', list: by('ready') }];
  }, [orders.data]);

  const actRef = useRef(async (fn: string, args: object) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) toast(friendlyError(error.message), 'error');
    else if ((data as { already_updated?: boolean } | null)?.already_updated) toast('Already updated');
    void client.invalidateQueries({ queryKey: ['barista-orders'] });
    void client.invalidateQueries({ queryKey: ['barista-stats'] });
  });
  const act = (fn: string, args: object) => void actRef.current(fn, args);


  return (
    <div className="min-h-dvh p-4">
      {!online && <div role="status" className="mb-3 rounded-xl border border-mango-400/50 bg-ink-800 p-2 text-center text-sm">Reconnecting. Orders refresh every 15 seconds.</div>}
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="h1-gradient text-4xl">Barista</h1>
        <ConnectionDot online={online} />
        <div className="px-2"><Stat label="Orders today" value={stats.data?.orders_today ?? 0} /></div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setBoard(true)}>Sold out</Button>
          <Button variant="secondary" onClick={() => setSound(true)}><Volume2 size={20} strokeWidth={1.75} />Sound</Button>
          {profile?.role === 'admin' && <Link to="/admin" className="btn btn-secondary glass">Admin</Link>}
          <Button variant="ghost" onClick={() => void signOut()}>Log out</Button>
        </div>
      </header>
      {orders.isLoading && <Skeleton className="h-64" />}
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((c) => (
          <section key={c.title} aria-label={c.title} className="space-y-3">
            <h2 className="flex items-center justify-between text-2xl">{c.title}<span className="tabular text-cream-300">{c.list.length}</span></h2>
            {c.list.map((o) => <OrderCard key={o.id} order={o} now={now} act={act} onCancel={setCancelling} />)}
            {c.list.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 p-6 text-center text-cream-300">Nothing here</p>}
          </section>
        ))}
      </div>
      <Switchboard open={board} onClose={() => setBoard(false)} />
      <Sheet open={sound} onClose={() => setSound(false)} title="Sound"><SoundSettings /></Sheet>
      <Modal open={cancelling !== null} onClose={() => setCancelling(null)} title={`Cancel #${cancelling?.order_no ?? ''}`}>
        <Field label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button className="mt-3 w-full" disabled={!reason.trim()}
          onClick={() => { act('cancel_order', { p_order_id: cancelling!.id, p_reason: reason }); setCancelling(null); setReason(''); }}>
          Cancel order
        </Button>
      </Modal>
    </div>
  );
}
