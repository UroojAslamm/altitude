import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Badge, Button, Card, cx, ErrorState, Field, Sheet, Skeleton, Stat, Tabs, TextArea, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMenu, useSettings } from '@/lib/queries';
import { aed, dubaiDate, friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { MenuItem, Settings } from '@/lib/types';

type Tab = 'menu' | 'dotm' | 'promos' | 'events' | 'lab' | 'reviews' | 'analytics' | 'settings';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'menu', label: 'Menu' }, { value: 'dotm', label: 'Drink of the Month' }, { value: 'promos', label: 'Promos' },
  { value: 'events', label: 'Events' }, { value: 'lab', label: 'Drink Lab' }, { value: 'reviews', label: 'Reviews' },
  { value: 'analytics', label: 'Analytics' }, { value: 'settings', label: 'Settings' },
];

function useSave() {
  const toast = useToast();
  const client = useQueryClient();
  return async (op: PromiseLike<{ error: { message: string } | null }>, done = 'Saved') => {
    const { error } = await op;
    toast(error ? friendlyError(error.message) : done, error ? 'error' : 'info');
    void client.invalidateQueries();
    return !error;
  };
}

const itemSchema = z.object({
  name: z.string().trim().min(2).max(60),
  price: z.coerce.number().min(0).max(500),
  prep_seconds: z.coerce.number().int().min(10).max(1200),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

function ItemEditor({ item, categoryId, onClose }: { item: MenuItem | null; categoryId: string; onClose: () => void }) {
  const save = useSave();
  const toast = useToast();
  const [f, setF] = useState({
    name: item?.name ?? '', description: item?.description ?? '', price: String((item?.base_price_fils ?? 2000) / 100),
    image_url: item?.image_url ?? '', accent_color: item?.accent_color ?? '#C99A5B', tags: item?.tags.join(', ') ?? '',
    prep_seconds: String(item?.prep_seconds ?? 90), kind: item?.kind ?? 'hot', caffeine_level: String(item?.caffeine_level ?? 0),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    const parsed = itemSchema.safeParse(f);
    if (!parsed.success) {
      toast('Check the name, price, prep time, and color', 'error');
      return;
    }
    const row = {
      name: parsed.data.name, description: f.description, base_price_fils: Math.round(parsed.data.price * 100),
      image_url: f.image_url.trim() || null, accent_color: parsed.data.accent_color, prep_seconds: parsed.data.prep_seconds,
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), kind: f.kind, caffeine_level: Number(f.caffeine_level),
      is_placeholder_price: false,
    };
    const ok = await save(item ? supabase.from('menu_items').update(row).eq('id', item.id) : supabase.from('menu_items').insert({ ...row, category_id: categoryId }));
    if (ok) onClose();
  }

  return (
    <div className="space-y-3">
      <Field label="Name" value={f.name} onChange={set('name')} />
      <TextArea label="Description" maxLength={200} value={f.description} onChange={set('description')} />
      <Field label="Price (AED)" inputMode="decimal" value={f.price} onChange={set('price')} />
      <Field label="Image URL (optional)" value={f.image_url} onChange={set('image_url')} />
      <Field label="Accent color" value={f.accent_color} onChange={set('accent_color')} />
      <Field label="Tags, comma separated" value={f.tags} onChange={set('tags')} />
      <Field label="Prep seconds" inputMode="numeric" value={f.prep_seconds} onChange={set('prep_seconds')} />
      <Field label="Caffeine level 0-3" inputMode="numeric" value={f.caffeine_level} onChange={set('caffeine_level')} />
      <label className="block">
        <span className="mb-1 block text-sm text-cream-300">Type</span>
        <select value={f.kind} onChange={set('kind')} className="min-h-[44px] w-full rounded-xl border border-ink-700 bg-ink-950 px-3">
          {['hot', 'iced', 'smoothie', 'shake', 'bakery'].map((k) => <option key={k}>{k}</option>)}
        </select>
      </label>
      <Button className="w-full" onClick={() => void submit()}>Save item</Button>
      {item && <Button variant="secondary" className="w-full" onClick={() => void save(supabase.from('menu_items').update({ is_active: false }).eq('id', item.id), 'Item hidden').then(onClose)}>Remove from menu</Button>}
    </div>
  );
}

function MenuTab() {
  const menu = useMenu();
  const save = useSave();
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  if (menu.isLoading) return <Skeleton className="h-60" />;
  if (menu.isError) return <ErrorState onRetry={() => void menu.refetch()} />;
  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing('new')}>Add item</Button>
      {menu.data?.categories.map((c) => (
        <section key={c.id}>
          <h2 className="mb-2 text-2xl">{c.name}</h2>
          <ul className="space-y-1">
            {menu.data.items.filter((i) => i.category_id === c.id).map((i) => (
              <li key={i.id} className="glass space-y-1 rounded-xl px-3 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 break-words font-semibold">{i.name}</span>
                  <span className="tabular shrink-0 text-sm">{aed(i.base_price_fils)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {i.is_placeholder_price && <Badge tone="warning">Placeholder price</Badge>}
                  {i.needs_review && <Badge tone="warning">Needs review</Badge>}
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setEditing(i)}>Edit</Button>
                    <Button variant="secondary" onClick={() => void save(supabase.from('menu_items').update({ is_available: !i.is_available }).eq('id', i.id))}>{i.is_available ? 'Available' : 'Sold out'}</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New item' : 'Edit item'}>
        {editing !== null && <ItemEditor key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? null : editing} categoryId={menu.data?.categories[0]?.id ?? ''} onClose={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function DotmTab() {
  const menu = useMenu();
  const save = useSave();
  const current = useQuery({
    queryKey: ['admin-dotm'],
    queryFn: async () => (await supabase.from('drink_of_month').select('*').eq('is_active', true).maybeSingle()).data as { id: string; menu_item_id: string; headline: string; special_price_fils: number | null } | null,
  });
  const [item, setItem] = useState('');
  const [headline, setHeadline] = useState('');
  const [price, setPrice] = useState('');
  useEffect(() => {
    if (current.data) {
      setItem(current.data.menu_item_id);
      setHeadline(current.data.headline);
      setPrice(current.data.special_price_fils ? String(current.data.special_price_fils / 100) : '');
    }
  }, [current.data]);

  async function submit() {
    const month = `${new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 7)}-01`;
    const row = { menu_item_id: item, headline, special_price_fils: price ? Math.round(Number(price) * 100) : null, month, is_active: true };
    if (current.data) await save(supabase.from('drink_of_month').update(row).eq('id', current.data.id));
    else await save(supabase.from('drink_of_month').insert(row));
  }

  return (
    <Card className="max-w-lg">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-cream-300">Drink</span>
          <select value={item} onChange={(e) => setItem(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-ink-700 bg-ink-950 px-3">
            <option value="">Choose one</option>
            {menu.data?.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <Field label="Special price AED (optional)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button disabled={!item} onClick={() => void submit()}>Save</Button>
      </div>
    </Card>
  );
}

function PromosTab() {
  const save = useSave();
  const data = useQuery({
    queryKey: ['admin-promos'],
    queryFn: async () => {
      const [p, a] = await Promise.all([
        supabase.from('promos').select('*').order('created_at', { ascending: false }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      ]);
      return {
        promos: (p.data ?? []) as Array<{ id: string; title: string; kind: string; value: number; is_active: boolean }>,
        announcements: (a.data ?? []) as Array<{ id: string; title: string; body: string; kind: string; is_active: boolean }>,
      };
    },
  });
  const [promo, setPromo] = useState({ title: '', description: '', value: '10', days: '7' });
  const [ann, setAnn] = useState({ title: '', body: '', exam: false, days: '7' });
  const until = (d: string) => new Date(Date.now() + Number(d) * 86400e3).toISOString();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-2 text-2xl">Promos</h2>
        <div className="space-y-2">
          <Field label="Title" value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} />
          <Field label="Description" value={promo.description} onChange={(e) => setPromo({ ...promo, description: e.target.value })} />
          <Field label="Percent off" inputMode="numeric" value={promo.value} onChange={(e) => setPromo({ ...promo, value: e.target.value })} />
          <Field label="Runs for days" inputMode="numeric" value={promo.days} onChange={(e) => setPromo({ ...promo, days: e.target.value })} />
          <Button disabled={!promo.title.trim()} onClick={() => void save(supabase.from('promos').insert({ title: promo.title, description: promo.description, kind: 'percent', value: Number(promo.value), ends_at: until(promo.days) }))}>Add promo</Button>
        </div>
        <ul className="mt-3 space-y-1">
          {data.data?.promos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>{p.title} ({p.value}%)</span>
              <Button variant="secondary" onClick={() => void save(supabase.from('promos').update({ is_active: !p.is_active }).eq('id', p.id))}>{p.is_active ? 'Active' : 'Off'}</Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 text-2xl">Announcements</h2>
        <div className="space-y-2">
          <Field label="Title" value={ann.title} onChange={(e) => setAnn({ ...ann, title: e.target.value })} />
          <Field label="Body" value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} />
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={ann.exam} onChange={(e) => setAnn({ ...ann, exam: e.target.checked })} />Exam week pop-up</label>
          <Button disabled={!ann.title.trim()} onClick={() => void save(supabase.from('announcements').insert({ title: ann.title, body: ann.body, kind: ann.exam ? 'exam_week' : 'info', ends_at: until(ann.days) }))}>Add announcement</Button>
        </div>
        <ul className="mt-3 space-y-1">
          {data.data?.announcements.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span>{a.title}</span>
              <Button variant="secondary" onClick={() => void save(supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id))}>{a.is_active ? 'Active' : 'Off'}</Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EventsTab() {
  const save = useSave();
  const list = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => (await supabase.from('events').select('id,title,status,starts_at,clubs(name)').order('starts_at')).data as unknown as Array<{ id: string; title: string; status: string; starts_at: string; clubs: { name: string } | null }>,
  });
  return (
    <ul className="space-y-2">
      {list.data?.map((e) => (
        <li key={e.id} className="glass flex flex-wrap items-center gap-2 rounded-xl p-3">
          <span className="min-w-0 flex-1 basis-full sm:basis-0"><strong>{e.title}</strong> <span className="text-sm text-cream-300">{e.clubs?.name}, {dubaiDate(e.starts_at)}</span></span>
          <Badge tone={e.status === 'approved' ? 'success' : e.status === 'pending' ? 'warning' : 'error'}>{e.status}</Badge>
          {e.status === 'pending' && (
            <>
              <Button onClick={() => void save(supabase.from('events').update({ status: 'approved' }).eq('id', e.id))}>Approve</Button>
              <Button variant="secondary" onClick={() => void save(supabase.from('events').update({ status: 'rejected' }).eq('id', e.id))}>Reject</Button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function LabTab() {
  const save = useSave();
  const list = useQuery({
    queryKey: ['admin-lab'],
    queryFn: async () => (await supabase.from('drink_submissions').select('*').order('vote_count', { ascending: false })).data as Array<{ id: string; name: string; author_name: string; vote_count: number; is_hidden: boolean; promoted_item_id: string | null }>,
  });
  return (
    <ul className="space-y-2">
      {list.data?.map((d) => (
        <li key={d.id} className="glass flex flex-wrap items-center gap-2 rounded-xl p-3">
          <span className="min-w-0 flex-1 basis-full sm:basis-0"><strong>{d.name}</strong> <span className="tabular text-sm text-cream-300">by {d.author_name}, {d.vote_count} votes</span></span>
          {d.promoted_item_id ? <Badge tone="brass">On menu</Badge> : <Button onClick={() => void save(supabase.rpc('promote_drink', { p_submission_id: d.id, p_price_fils: 2200 }), 'Added to the menu')}>Promote</Button>}
          <Button variant="secondary" onClick={() => void save(supabase.from('drink_submissions').update({ is_hidden: !d.is_hidden }).eq('id', d.id))}>{d.is_hidden ? 'Unhide' : 'Hide'}</Button>
        </li>
      ))}
    </ul>
  );
}

function ReviewsTab() {
  const save = useSave();
  const list = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => (await supabase.from('reviews').select('id,author_name,rating,body,is_hidden').order('created_at', { ascending: false }).limit(50)).data as Array<{ id: string; author_name: string; rating: number; body: string; is_hidden: boolean }>,
  });
  return (
    <ul className="space-y-2">
      {list.data?.map((r) => (
        <li key={r.id} className="glass flex items-center gap-2 rounded-xl p-3">
          <span className="min-w-0 flex-1 basis-full break-words sm:basis-0"><strong>{r.author_name}</strong> ({r.rating}/5) {r.body}</span>
          <Button variant="secondary" onClick={() => void save(supabase.from('reviews').update({ is_hidden: !r.is_hidden }).eq('id', r.id))}>{r.is_hidden ? 'Unhide' : 'Hide'}</Button>
        </li>
      ))}
    </ul>
  );
}

interface Analytics {
  sales_by_day: Array<{ day: string; fils: number; orders: number }>;
  top_items: Array<{ name: string; qty_sold: number }>;
  heatmap: Array<{ dow: number; hour: number; orders: number }>;
  avg_prep_seconds: number;
  meters_issued: number;
}

function AnalyticsTab() {
  const stats = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_analytics');
      if (error) throw new Error(error.message);
      return data as Analytics;
    },
  });
  if (stats.isLoading) return <Skeleton className="h-60" />;
  if (stats.isError || !stats.data) return <ErrorState onRetry={() => void stats.refetch()} />;
  const s = stats.data;
  const maxDay = Math.max(1, ...s.sales_by_day.map((d) => d.fils));
  const maxItem = Math.max(1, ...s.top_items.map((d) => d.qty_sold));
  const maxCell = Math.max(1, ...s.heatmap.map((d) => d.orders));
  const hours = Array.from({ length: 11 }, (_, i) => i + 7);
  return (
    <div className="space-y-4">
      <p className="text-sm text-cream-300">Includes seeded demo data.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><Stat label="Sales, 28 days" value={aed(s.sales_by_day.reduce((n, d) => n + d.fils, 0))} /></Card>
        <Card><Stat label="Orders, 28 days" value={s.sales_by_day.reduce((n, d) => n + d.orders, 0)} /></Card>
        <Card><Stat label="Avg prep" value={`${(s.avg_prep_seconds / 60).toFixed(1)} min`} /></Card>
        <Card><Stat label="Meters issued" value={s.meters_issued} /></Card>
      </div>
      <Card>
        <h2 className="mb-2 text-2xl">Sales by day</h2>
        <div className="flex h-36 items-end gap-1" role="img" aria-label="Daily sales">
          {s.sales_by_day.map((d) => <div key={d.day} title={`${d.day}: ${aed(d.fils)}`} className="brass flex-1 rounded-t" style={{ height: `${(d.fils / maxDay) * 100}%` }} />)}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-2xl">Top items</h2>
          <ul className="space-y-1.5">
            {s.top_items.map((t) => (
              <li key={t.name}>
                <div className="flex justify-between text-sm"><span>{t.name}</span><span className="tabular">{t.qty_sold}</span></div>
                <div className="brass h-1.5 rounded-full" style={{ width: `${(t.qty_sold / maxItem) * 100}%` }} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 text-2xl">Busiest hours</h2>
          <div className="grid gap-1" style={{ gridTemplateColumns: `2.5rem repeat(${hours.length}, 1fr)` }}>
            <span />
            {hours.map((h) => <span key={h} className="tabular text-center text-[10px] text-cream-300">{h}</span>)}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((name, i) => (
              <div key={name} className="contents">
                <span className="text-xs text-cream-300">{name}</span>
                {hours.map((h) => {
                  const cell = s.heatmap.find((c) => c.dow === i + 1 && c.hour === h);
                  return <span key={h} title={`${name} ${h}:00: ${cell?.orders ?? 0}`} className="h-6 rounded-sm" style={{ background: `rgba(245,177,74,${0.08 + ((cell?.orders ?? 0) / maxCell) * 0.9})` }} />;
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsTab() {
  const settings = useSettings();
  const save = useSave();
  const [f, setF] = useState<Settings | null>(null);
  useEffect(() => { if (settings.data && !f) setF(settings.data); }, [settings.data, f]);
  if (!f) return <Skeleton className="h-60" />;
  const num = (v: string) => Number(v) || 0;
  const social = ['instagram', 'tiktok', 'x', 'facebook', 'google', 'website'];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-2 text-2xl">Hours</h2>
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={f.accepting_orders} onChange={(e) => setF({ ...f, accepting_orders: e.target.checked })} />Accepting orders</label>
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={f.demo_always_open} onChange={(e) => setF({ ...f, demo_always_open: e.target.checked })} />Demo: always open</label>
          <Field label="Open" type="time" value={f.open_time.slice(0, 5)} onChange={(e) => setF({ ...f, open_time: e.target.value })} />
          <Field label="Close" type="time" value={f.close_time.slice(0, 5)} onChange={(e) => setF({ ...f, close_time: e.target.value })} />
          <Field label="Open days (1 Mon to 7 Sun)" value={f.days_open.join(',')} onChange={(e) => setF({ ...f, days_open: e.target.value.split(',').map(num).filter(Boolean) })} />
          <Field label="Baristas on shift" inputMode="numeric" value={f.barista_count} onChange={(e) => setF({ ...f, barista_count: Math.max(1, num(e.target.value)) })} />
          <Field label="Allowed email domains" value={f.allowed_domains.join(', ')} onChange={(e) => setF({ ...f, allowed_domains: e.target.value.split(',').map((d) => d.trim()).filter(Boolean) })} />
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-2xl">Loyalty</h2>
        <div className="space-y-2">
          {(['ridge', 'summit', 'peak'] as const).map((t) => (
            <Field key={t} label={`${t} threshold`} inputMode="numeric" value={f.tier_thresholds[t]} onChange={(e) => setF({ ...f, tier_thresholds: { ...f.tier_thresholds, [t]: num(e.target.value) } })} />
          ))}
          <Field label="Squad bonus %" inputMode="numeric" value={f.squad_bonus_pct} onChange={(e) => setF({ ...f, squad_bonus_pct: num(e.target.value) })} />
          <Field label="Squad L2 meters" inputMode="numeric" value={f.squad_levels.l2} onChange={(e) => setF({ ...f, squad_levels: { ...f.squad_levels, l2: num(e.target.value) } })} />
          <Field label="Squad L3 meters" inputMode="numeric" value={f.squad_levels.l3} onChange={(e) => setF({ ...f, squad_levels: { ...f.squad_levels, l3: num(e.target.value) } })} />
          <Field label="Common Hour start" type="time" value={f.common_hour_start.slice(0, 5)} onChange={(e) => setF({ ...f, common_hour_start: e.target.value })} />
          <Field label="Common Hour end" type="time" value={f.common_hour_end.slice(0, 5)} onChange={(e) => setF({ ...f, common_hour_end: e.target.value })} />
          <Field label="Common Hour multiplier" inputMode="numeric" value={f.common_hour_multiplier} onChange={(e) => setF({ ...f, common_hour_multiplier: Math.max(1, num(e.target.value)) })} />
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-2xl">Social links</h2>
        <p className="mb-2 text-sm text-cream-300">Empty links stay hidden.</p>
        <div className="space-y-2">
          {social.map((k) => <Field key={k} label={k} value={f.social_links[k] ?? ''} onChange={(e) => setF({ ...f, social_links: { ...f.social_links, [k]: e.target.value } })} />)}
        </div>
      </Card>
      <div className="lg:col-span-2">
        <Button onClick={() => void save(supabase.from('settings').update(f).eq('id', true))}>Save settings</Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('menu');
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="h1-gradient text-4xl">Admin</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to="/barista" className="btn btn-secondary glass">Counter</Link>
          <Link to="/demo" className="btn btn-secondary glass">Demo</Link>
          <Link to="/menu" className="btn btn-secondary glass">Student view</Link>
          <Button variant="ghost" onClick={() => void signOut()}>Log out</Button>
        </div>
      </header>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className={cx(tab === 'menu' && 'max-w-3xl')}>
        {tab === 'menu' && <MenuTab />}
        {tab === 'dotm' && <DotmTab />}
        {tab === 'promos' && <PromosTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'lab' && <LabTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
