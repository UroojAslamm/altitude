import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { playAlert } from '@/lib/chime';
import { useMyOrders, useRealtime } from '@/lib/queries';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { ReadyPanel } from './ReadyPanel';
import { useToast } from './ui';

/** Sound and the Ready alert when a drink is ready, on whichever screen the student is on. */
export function ReadyWatcher() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const orders = useMyOrders(uid, 5);
  useRealtime([{ table: 'orders', filter: `user_id=eq.${uid}`, keys: [['orders']] }], `ready-${uid}`);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const seen = useRef<Map<string, OrderStatus> | null>(null);
  const [ready, setReady] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const waiting = orders.data?.some((o) => o.status === 'placed' || o.status === 'preparing') ?? false;

  // The database decides when an order moves on. This only asks it to check.
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setInterval(() => {
      void supabase.rpc('auto_advance_orders').then(({ data }) => {
        if (!data) return;
        void client.invalidateQueries({ queryKey: ['orders'] });
        void client.invalidateQueries({ queryKey: ['order'] });
        void client.invalidateQueries({ queryKey: ['queue'] });
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [waiting, client]);

  useEffect(() => {
    if (!orders.data) return;
    const before = seen.current;
    seen.current = new Map(orders.data.map((o) => [o.id, o.status]));
    if (!before) return;
    const fresh = orders.data.find((o) => o.status === 'ready' && before.get(o.id) !== 'ready');
    if (!fresh) return;
    playAlert('ready');
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    setReady(fresh);
  }, [orders.data]);

  // Picking it up here does what it does on the order page, then shows the meters earned there.
  async function pickUp(order: Order) {
    setBusy(true);
    const { error } = await supabase.rpc('complete_order', { p_order_id: order.id });
    if (error) toast(friendlyError(error.message), 'error');
    await Promise.all([
      client.invalidateQueries({ queryKey: ['order', order.id] }),
      client.invalidateQueries({ queryKey: ['orders'] }),
      client.invalidateQueries({ queryKey: ['profile', uid] }),
    ]);
    setBusy(false);
    setReady(null);
    navigate(`/orders/${order.id}`);
  }

  // The order's own page shows the same panel itself.
  if (!ready || pathname === `/orders/${ready.id}`) return null;
  return <ReadyPanel order={ready} busy={busy} onDone={() => void pickUp(ready)} />;
}
