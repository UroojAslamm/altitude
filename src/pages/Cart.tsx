import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, PageHeader } from '@/components/AppShell';
import { DrinkArt } from '@/components/DrinkArt';
import {
  Button, Card, Chip, EmptyState, Field, Segmented, Skeleton, Stepper, TextArea, useToast,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cartPayload, useCart } from '@/lib/cart';
import { useMenu, useSettings, useVouchers } from '@/lib/queries';
import { payments } from '@/lib/payment';
import { aed, friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { PricePreview } from '@/lib/types';

export function CartPage() {
  const { lines, setQty, remove } = useCart();
  const menu = useMenu();
  const subtotal = lines.reduce((s, l) => s + l.unitFils * l.qty, 0);

  const problems = useMemo(() => {
    if (!menu.data) return [];
    return lines.flatMap((l) => {
      const item = menu.data.items.find((i) => i.id === l.itemId);
      return !item || !item.is_available ? [`${l.name} just sold out. Remove it to continue.`] : [];
    });
  }, [lines, menu.data]);

  if (lines.length === 0) {
    return (
      <>
        <PageHeader title="Cart" />
        <Page><EmptyState title="Your cart is empty" body="Pick something good." action={<Link to="/menu" className="btn btn-primary">Browse menu</Link>} /></Page>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Cart" />
      <Page>
        {problems.map((p) => <div key={p} role="alert" className="rounded-xl border border-berry-500/60 bg-[#3A1418] p-3 text-sm">{p}</div>)}
        {lines.map((l) => (
          <Card key={l.key}>
            <div className="flex items-center gap-3">
              <DrinkArt kind={l.kind} accent={l.accent} name={l.name} size={64} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.name}</div>
                {l.optionNames.length > 0 && <div className="truncate text-sm text-cream-300">{l.optionNames.join(', ')}</div>}
                <div className="tabular text-sm">{aed(l.unitFils * l.qty)}</div>
              </div>
              <Button variant="icon" aria-label={`Remove ${l.name}`} onClick={() => remove(l.key)}><Trash2 size={20} strokeWidth={1.75} /></Button>
            </div>
            <div className="mt-2"><Stepper label={`${l.name} quantity`} value={l.qty} onChange={(q) => setQty(l.key, q)} /></div>
          </Card>
        ))}
        <div className="flex justify-between text-lg"><span>Subtotal</span><span className="tabular font-semibold">{aed(subtotal)}</span></div>
        <Link to="/checkout" aria-disabled={problems.length > 0} className={`btn btn-primary w-full ${problems.length ? 'pointer-events-none opacity-50' : ''}`}>Checkout</Link>
      </Page>
    </>
  );
}

const TIPS = [0, 200, 500, 1000];

export function CheckoutPage() {
  const { session } = useAuth();
  const { lines, clear } = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const client = useQueryClient();
  const settings = useSettings();
  const vouchers = useVouchers(session?.user.id);
  const [notes, setNotes] = useState('');
  const [dine, setDine] = useState<'in' | 'away'>('in');
  const [voucher, setVoucher] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [payment, setPayment] = useState<'demo_card' | 'pickup'>('demo_card');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const lock = useRef(false);

  const payload = useMemo(() => cartPayload(lines), [lines]);
  const preview = useQuery({
    queryKey: ['preview', payload, voucher],
    enabled: lines.length > 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('price_preview', { p_items: payload, p_voucher: voucher });
      if (error) throw new Error(error.message);
      return data as PricePreview;
    },
  });
  const open = useQuery({
    queryKey: ['cafe-open'],
    queryFn: async () => (await supabase.rpc('cafe_is_open')).data as boolean,
  });

  const tipFils = customTip ? Math.min(10000, Math.max(0, Math.round(Number(customTip) * 100) || 0)) : tip;
  const accepting = settings.data?.accepting_orders ?? true;
  const canOrder = accepting && open.data !== false && preview.isSuccess;

  async function placeOrder() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    if (payment === 'demo_card') await payments.charge(preview.data?.total_fils ?? 0, requestId.current);
    const { data, error } = await supabase.rpc('place_order', {
      p_items: payload, p_payment_method: payment, p_dine_in: dine === 'in', p_notes: notes,
      p_tip_fils: tipFils, p_voucher_id: voucher, p_client_request_id: requestId.current,
    });
    if (error) {
      toast(friendlyError(error.message), 'error');
      requestId.current = crypto.randomUUID();
      lock.current = false;
      setBusy(false);
      void client.invalidateQueries({ queryKey: ['menu'] });
      return;
    }
    const result = data as { order_id: string };
    clear();
    void client.invalidateQueries({ queryKey: ['orders'] });
    void client.invalidateQueries({ queryKey: ['vouchers'] });
    navigate(`/orders/${result.order_id}`, { replace: true });
  }

  if (lines.length === 0 && !busy) {
    return <Page><EmptyState title="Nothing to check out" action={<Link to="/menu" className="btn btn-primary">Browse menu</Link>} /></Page>;
  }

  const p = preview.data;
  return (
    <>
      <PageHeader title="Checkout" />
      <Page className="lg:max-w-2xl">
        {!accepting && <div role="alert" className="rounded-xl border border-mango-400/50 bg-ink-800 p-3">The counter has paused new orders for a moment.</div>}
        {open.data === false && <div role="alert" className="rounded-xl border border-mango-400/50 bg-ink-800 p-3">Altitude is closed right now.</div>}
        {preview.isError && <div role="alert" className="rounded-xl border border-berry-500/60 bg-[#3A1418] p-3">{friendlyError(preview.error.message)}</div>}
        <Card>
          {preview.isLoading ? <Skeleton className="h-24" /> : p && (
            <dl className="tabular space-y-1">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{aed(p.subtotal_fils)}</dd></div>
              {p.free_shot_fils > 0 && <div className="flex justify-between text-glow-300"><dt>Free extra shot</dt><dd>-{aed(p.free_shot_fils)}</dd></div>}
              {p.discount_fils > 0 && <div className="flex justify-between text-glow-300"><dt>{p.discount_label}</dt><dd>-{aed(p.discount_fils)}</dd></div>}
              {tipFils > 0 && <div className="flex justify-between"><dt>Tip</dt><dd>{aed(tipFils)}</dd></div>}
              <div className="brass-rule my-2" />
              <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd data-testid="total">{aed(p.total_fils + tipFils)}</dd></div>
            </dl>
          )}
        </Card>
        <TextArea label="Preferences" maxLength={140} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. extra hot, room temperature" />
        <Segmented label="Dine in or take away" value={dine} onChange={setDine} options={[{ value: 'in', label: 'Dine in' }, { value: 'away', label: 'Take away' }]} />
        {(vouchers.data?.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 text-sm text-cream-300">Voucher</p>
            <div className="flex flex-wrap gap-2">
              {vouchers.data?.map((v) => <Chip key={v.id} active={voucher === v.id} onClick={() => setVoucher(voucher === v.id ? null : v.id)}>{v.label}</Chip>)}
            </div>
            {voucher && p && !p.voucher_applied && <p className="mt-1 text-sm text-cream-300">Your current discount is better, so this voucher stays in your wallet.</p>}
          </div>
        )}
        <div>
          <p className="mb-2 text-sm text-cream-300">Tip your barista</p>
          <div className="flex flex-wrap items-end gap-2">
            {TIPS.map((t) => <Chip key={t} active={!customTip && tip === t} onClick={() => { setTip(t); setCustomTip(''); }}>{t === 0 ? 'None' : aed(t)}</Chip>)}
            <div className="w-28"><Field label="Custom AED" inputMode="decimal" value={customTip} onChange={(e) => setCustomTip(e.target.value.replace(/[^\d.]/g, ''))} /></div>
          </div>
        </div>
        <Segmented label="Payment" value={payment} onChange={setPayment} options={[{ value: 'demo_card', label: 'Demo payment' }, { value: 'pickup', label: 'Pay at pickup' }]} />
        {payment === 'demo_card' && <p className="text-sm text-cream-300">Demo payment. No real card is charged.</p>}
        <p className="text-sm text-cream-300">Ask our staff about allergens.</p>
        <Button className="w-full" disabled={!canOrder || busy} onClick={() => void placeOrder()}>{busy ? 'Placing order' : 'Place order'}</Button>
      </Page>
    </>
  );
}
