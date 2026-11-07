import { useQuery } from '@tanstack/react-query';
import { Clock, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '@/components/AppShell';
import { PhotoBackdrop } from '@/components/brand';
import { DrinkArt } from '@/components/DrinkArt';
import { SocialButtons } from '@/components/SocialButtons';
import { Badge, Card, cx, Modal, Button, ProgressRing, Skeleton, TIER_LABEL, TierShield } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMenu, useMyOrders, useRealtime, useSettings } from '@/lib/queries';
import { aed, commonHourLabel, commonHourLeft, tierFor, tierProgress } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/lib/types';

interface Dotm { menu_item_id: string; headline: string; special_price_fils: number | null }
interface Announcement { id: string; title: string; body: string; kind: string }
interface Popular { menu_item_id: string; name: string; kind: string; accent_color: string; base_price_fils: number; qty_sold: number }
interface Busy { hour: number; orders: number; avg_wait_seconds: number }

function useHomeData() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [dotm, ann, popular, busy, favs] = await Promise.all([
        supabase.from('drink_of_month').select('menu_item_id,headline,special_price_fils').eq('is_active', true).maybeSingle(),
        supabase.from('announcements').select('id,title,body,kind').eq('is_active', true).lte('starts_at', nowIso).gte('ends_at', nowIso).limit(1),
        supabase.from('popular_items').select('*').limit(5),
        supabase.from('busy_hours').select('*'),
        supabase.from('favorites').select('menu_item_id').limit(4),
      ]);
      const dotmRow = dotm.data as Dotm | null;
      let pairing = null as { pair_name: string; pct: number } | null;
      if (dotmRow) {
        const { data } = await supabase.from('pairing_stats').select('pair_name,pct').eq('item_id', dotmRow.menu_item_id).order('pct', { ascending: false }).limit(1);
        pairing = (data?.[0] as { pair_name: string; pct: number } | undefined) ?? null;
      }
      return {
        dotm: dotmRow, pairing,
        announcement: (ann.data as Announcement[] | null)?.[0] ?? null,
        popular: (popular.data as Popular[] | null) ?? [],
        busy: (busy.data as Busy[] | null) ?? [],
        favorites: ((favs.data as Array<{ menu_item_id: string }> | null) ?? []).map((f) => f.menu_item_id),
      };
    },
  });
}

function MiniItem({ item }: { item: Pick<MenuItem, 'id' | 'name' | 'kind' | 'accent_color' | 'base_price_fils'> }) {
  return (
    <Link to={`/menu/${item.id}`} className="glass gloss block w-36 shrink-0 rounded-2xl p-3 text-center">
      <div className="relative grid place-items-center"><DrinkArt kind={item.kind} accent={item.accent_color} name={item.name} size={80} /></div>
      <div className="relative truncate font-semibold">{item.name}</div>
      <div className="tabular relative text-sm text-cream-300">{aed(item.base_price_fils)}</div>
    </Link>
  );
}

function BusyCard({ busy, open, close }: { busy: Busy[]; open: string; close: string }) {
  const hours = busy.filter((b) => b.hour >= Number(open.slice(0, 2)) && b.hour < Number(close.slice(0, 2)));
  if (hours.length === 0) return null;
  const max = Math.max(...hours.map((h) => h.orders));
  const best = [...hours].sort((a, b) => a.avg_wait_seconds - b.avg_wait_seconds || a.orders - b.orders)[0]!;
  return (
    <Card>
      <h2 className="text-2xl">Best time to come</h2>
      <p className="text-cream-300">{String(best.hour).padStart(2, '0')}:00, about {Math.max(1, Math.round(best.avg_wait_seconds / 60))} min wait</p>
      <div className="mt-3 flex h-20 items-end gap-1" role="img" aria-label="Orders by hour over the last 28 days">
        {hours.map((h) => (
          <div key={h.hour} className="flex h-full flex-1 flex-col justify-end">
            <div className={cx('rounded-t', h.hour === best.hour ? 'brass-soft' : 'bg-oak-600/60')} style={{ height: `${(h.orders / max) * 100}%` }} />
            <span className="tabular mt-1 text-center text-[10px] text-cream-300">{h.hour}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExamPopup({ announcement }: { announcement: Announcement }) {
  const key = `seen-${announcement.id}`;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (announcement.kind === 'exam_week' && !sessionStorage.getItem(key)) setOpen(true);
  }, [announcement.kind, key]);
  const close = () => { sessionStorage.setItem(key, '1'); setOpen(false); };
  return (
    <Modal open={open} onClose={close} title={announcement.title}>
      <p className="text-cream-100">{announcement.body}</p>
      <Button className="mt-4 w-full" onClick={close}>Got it</Button>
    </Modal>
  );
}

export function HomePage() {
  const { profile, session } = useAuth();
  const uid = session?.user.id;
  const home = useHomeData();
  const menu = useMenu();
  const settings = useSettings();
  const orders = useMyOrders(uid, 5);
  useRealtime(
    [{ table: 'orders', filter: `user_id=eq.${uid}`, keys: [['orders']] }, { table: 'settings', keys: [['settings']] }],
    `home-${uid}`,
  );
  if (!profile) return <Page><Skeleton className="h-52" /></Page>;

  const s = settings.data;
  const tier = tierFor(profile.total_meters, s?.tier_thresholds);
  const progress = tierProgress(profile.total_meters, s?.tier_thresholds);
  const active = orders.data?.find((o) => ['placed', 'preparing', 'ready'].includes(o.status));
  const items = menu.data?.items ?? [];
  const dotmItem = items.find((i) => i.id === home.data?.dotm?.menu_item_id);
  const usual = (home.data?.favorites ?? []).map((id) => items.find((i) => i.id === id)).filter((i): i is MenuItem => Boolean(i));
  const hourLeft = s ? commonHourLeft(s.common_hour_start, s.common_hour_end, s.common_hour_days) : null;
  const firstName = profile.full_name.split(' ')[0];

  return (
    <>
      <PhotoBackdrop name="wall" position="50% 38%" className="min-h-[260px]">
        <div className="mx-auto flex h-full min-h-[260px] max-w-[1200px] items-end justify-between gap-4 px-4 pb-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-cream-100">Hello {firstName}</p>
            <h1 className="h1-gradient text-5xl">{TIER_LABEL[tier]}</h1>
            <p className="tabular text-cream-100" data-testid="to-next">
              {progress.next ? `${progress.toGo} m to ${TIER_LABEL[progress.next]}` : 'Top of the range'}
            </p>
          </div>
          <ProgressRing value={progress.fraction} size={108}><TierShield tier={tier} size={46} /></ProgressRing>
        </div>
      </PhotoBackdrop>
      <Page>
        {active && (
          <Link to={`/orders/${active.id}`} className="block">
            <Card variant="feature">
              <div className="flex items-center justify-between">
                <span className="tabular font-display text-3xl font-bold">Order #{active.order_no}</span>
                <Badge tone="brass">{active.status}</Badge>
              </div>
              <p className="text-cream-300">Tap to watch the queue.</p>
            </Card>
          </Link>
        )}
        {home.data?.announcement && (
          <>
            <Card><h2 className="text-2xl">{home.data.announcement.title}</h2><p className="text-cream-300">{home.data.announcement.body}</p></Card>
            <ExamPopup announcement={home.data.announcement} />
          </>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {dotmItem && home.data?.dotm && (
            <Link to={`/menu/${dotmItem.id}`} className="gloss hairline block rounded-2xl bg-gradient-to-br from-maroon-700 to-[#2c0a10] p-5 shadow-e3">
              <div className="relative flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-glow-300">Drink of the Month</p>
                  <h2 className="text-3xl">{dotmItem.name}</h2>
                  <p className="text-sm text-cream-100">{home.data.dotm.headline}</p>
                  <p className="tabular mt-1 font-semibold">{aed(home.data.dotm.special_price_fils ?? dotmItem.base_price_fils)}</p>
                  <span className="btn btn-primary mt-3">Try it</span>
                </div>
                <DrinkArt kind={dotmItem.kind} accent={dotmItem.accent_color} name={dotmItem.name} size={120} />
              </div>
              {home.data.pairing && <p className="relative mt-3 text-sm text-cream-100">{home.data.pairing.pct}% of students who order this add a {home.data.pairing.pair_name}.</p>}
            </Link>
          )}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="glass inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm">
                {hourLeft !== null ? <Zap size={20} strokeWidth={1.75} className="text-glow-500" /> : <Clock size={20} strokeWidth={1.75} />}
                {hourLeft !== null ? `Common Hour: ${s?.common_hour_multiplier}x meters, ${hourLeft} min left` : s ? `Common Hour ${commonHourLabel(s.common_hour_start, s.common_hour_end)}, ${s.common_hour_multiplier}x meters` : 'Common Hour'}
              </span>
            </div>
            {s && home.data && <BusyCard busy={home.data.busy} open={s.open_time} close={s.close_time} />}
          </div>
        </div>
        {home.isLoading && <Skeleton className="h-40" />}
        {(home.data?.popular.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-2 text-2xl">Popular now</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {home.data?.popular.map((p) => <MiniItem key={p.menu_item_id} item={{ ...p, id: p.menu_item_id, kind: p.kind as MenuItem['kind'] }} />)}
            </div>
          </section>
        )}
        {usual.length > 0 && (
          <section>
            <h2 className="mb-2 text-2xl">Your usual</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">{usual.map((i) => <MiniItem key={i.id} item={i} />)}</div>
          </section>
        )}
        <nav aria-label="More" className="flex flex-wrap gap-2">
          <Link to="/offers" className="btn btn-secondary glass">Offers</Link>
        </nav>
        <SocialButtons links={s?.social_links} />
      </Page>
    </>
  );
}
