import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { playAlert } from '@/lib/chime';
import { useMyOrders, useRealtime } from '@/lib/queries';
import type { Order, OrderStatus } from '@/lib/types';
import { Button, Modal } from './ui';

/** Sound and pop-up when a drink is ready, on whichever screen the student is on. */
export function ReadyWatcher() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const orders = useMyOrders(uid, 5);
  useRealtime([{ table: 'orders', filter: `user_id=eq.${uid}`, keys: [['orders']] }], `ready-${uid}`);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const seen = useRef<Map<string, OrderStatus> | null>(null);
  const [ready, setReady] = useState<Order | null>(null);

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

  // The order's own page has a full-screen Ready panel.
  const open = ready !== null && pathname !== `/orders/${ready.id}`;
  return (
    <Modal open={open} onClose={() => setReady(null)} title="Your drink is ready">
      <p className="tabular text-cream-100">Order #{ready?.order_no}. Collect it at the counter.</p>
      {ready?.prepared_by_name && <p className="text-cream-300">Prepared by {ready.prepared_by_name}.</p>}
      <Button className="mt-4 w-full" onClick={() => { const id = ready?.id; setReady(null); if (id) navigate(`/orders/${id}`); }}>View order</Button>
    </Modal>
  );
}
