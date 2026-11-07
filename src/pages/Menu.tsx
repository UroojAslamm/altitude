import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Page, PageHeader } from '@/components/AppShell';
import { DrinkArt } from '@/components/DrinkArt';
import { MoodSheet } from '@/components/MoodSheet';
import {
  Badge, Button, Card, Chip, cx, EmptyState, ErrorState, Rating, Sheet, Skeleton, Slider, Stepper, useToast,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { EMPTY_FILTERS, useMenuFilters } from '@/lib/menuFilters';
import { useItemOptions, useMenu, useRealtime } from '@/lib/queries';
import { aed, pinFavorites, withArticle } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import type { MenuItem, Option } from '@/lib/types';

const DIETARY = ['dairy-free', 'low-sugar', 'vegan', 'caffeine-free'];

function useFavorites(uid?: string) {
  return useQuery({
    queryKey: ['favorites', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select('menu_item_id');
      if (error) throw new Error(error.message);
      return new Set((data as Array<{ menu_item_id: string }>).map((f) => f.menu_item_id));
    },
  });
}

function FavoriteButton({ itemId, active }: { itemId: string; active: boolean }) {
  const client = useQueryClient();
  return (
    <button
      type="button"
      aria-label={active ? 'Remove from favorites' : 'Star as usual'}
      aria-pressed={active}
      className="grid h-11 w-11 place-items-center"
      onClick={async (e) => {
        e.preventDefault();
        await supabase.rpc('toggle_favorite', { p_item_id: itemId });
        void client.invalidateQueries({ queryKey: ['favorites'] });
        void client.invalidateQueries({ queryKey: ['home'] });
      }}
    >
      <Heart size={20} strokeWidth={1.75} className={active ? 'fill-glow-500 text-glow-500' : 'text-cream-300'} />
    </button>
  );
}

export function ItemCard({ item, rating, favorite }: { item: MenuItem; rating?: number; favorite: boolean }) {
  return (
    <Link to={`/menu/${item.id}`} className="glass gloss relative block rounded-2xl p-3" data-testid="menu-item">
      <div className="absolute right-1 top-1 z-10"><FavoriteButton itemId={item.id} active={favorite} /></div>
      <div className="relative grid place-items-center py-2">
        <div className="absolute h-24 w-24 rounded-full blur-2xl" style={{ background: item.accent_color, opacity: 0.4 }} />
        <div className={cx('relative', !item.is_available && 'opacity-40 grayscale')}>
          <DrinkArt kind={item.kind} accent={item.accent_color} name={item.name} imageUrl={item.image_url} size={108} />
        </div>
        {!item.is_available && <div className="absolute"><Badge tone="error">Sold out</Badge></div>}
      </div>
      <h3 className="relative text-xl">{item.name}</h3>
      <p className="relative line-clamp-2 min-h-[2.5rem] text-sm text-cream-300">{item.description}</p>
      <div className="relative mt-1 flex items-center justify-between">
        <span className="tabular font-semibold">{aed(item.base_price_fils)}</span>
        {rating !== undefined && <span className="tabular text-sm text-cream-300">{rating.toFixed(1)} stars</span>}
      </div>
    </Link>
  );
}

export function MenuPage() {
  const { session } = useAuth();
  const menu = useMenu();
  const favorites = useFavorites(session?.user.id);
  useRealtime([{ table: 'menu_items', keys: [['menu']] }], 'menu-live');
  const { category, query, filters, setCategory, setQuery, setFilters } = useMenuFilters();
  const [sheet, setSheet] = useState(false);
  const [mood, setMood] = useState(false);

  const filterCount = filters.tags.length + (filters.maxPrice < EMPTY_FILTERS.maxPrice ? 1 : 0) + (filters.temp !== 'any' ? 1 : 0) + (filters.caffeine !== null ? 1 : 0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pinFavorites((menu.data?.items ?? []).filter((i) => {
      if (category && i.category_id !== category) return false;
      if (q && !`${i.name} ${i.description}`.toLowerCase().includes(q)) return false;
      if (filters.tags.some((t) => !i.tags.includes(t))) return false;
      if (i.base_price_fils > filters.maxPrice) return false;
      if (filters.temp === 'hot' && i.kind !== 'hot') return false;
      if (filters.temp === 'cold' && !['iced', 'smoothie', 'shake'].includes(i.kind)) return false;
      if (filters.caffeine !== null && i.caffeine_level !== filters.caffeine) return false;
      return true;
    }), favorites.data);
  }, [menu.data, favorites.data, category, query, filters]);

  const toggleTag = (t: string) =>
    setFilters((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }));

  return (
    <>
      <PageHeader title="Menu" subtitle="Real fruit, proper espresso." photo="counter" position="60% 55%" />
      <Page>
        <div className="flex gap-2">
          <label className="glass flex min-h-[44px] flex-1 items-center gap-2 rounded-xl px-3">
            <Search size={20} strokeWidth={1.75} className="text-cream-300" />
            <span className="sr-only">Search the menu</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full bg-transparent outline-none placeholder:text-cream-300/70" />
          </label>
          <Button variant="secondary" onClick={() => setSheet(true)} aria-label="Filters">
            <SlidersHorizontal size={20} strokeWidth={1.75} />
            {filterCount > 0 && <Badge tone="brass">{filterCount}</Badge>}
          </Button>
          <Button variant="secondary" onClick={() => setMood(true)} aria-label="Mood picker"><Sparkles size={20} strokeWidth={1.75} /></Button>
        </div>
        <div className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-ink-900/80 px-4 py-2 backdrop-blur">
          <Chip active={category === null} onClick={() => setCategory(null)}>All</Chip>
          {menu.data?.categories.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Chip>
          ))}
        </div>
        {menu.isLoading && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-60" />)}</div>}
        {menu.isError && <ErrorState onRetry={() => void menu.refetch()} />}
        {menu.data && items.length === 0 && (
          <EmptyState title="Nothing matches" body="Try fewer filters." action={<Button variant="secondary" onClick={() => { setFilters(EMPTY_FILTERS); setQuery(''); setCategory(null); }}>Clear all</Button>} />
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <ItemCard key={i.id} item={i} rating={menu.data?.ratings.get(i.id)?.rating} favorite={favorites.data?.has(i.id) ?? false} />
          ))}
        </div>
      </Page>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-cream-300">Dietary preferences</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((t) => <Chip key={t} active={filters.tags.includes(t)} onClick={() => toggleTag(t)}>{t}</Chip>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-cream-300">Caffeine</p>
            <div className="flex flex-wrap gap-2">
              {['None', 'Low', 'Medium', 'High'].map((label, level) => (
                <Chip key={label} active={filters.caffeine === level} onClick={() => setFilters((f) => ({ ...f, caffeine: f.caffeine === level ? null : level }))}>{label}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-cream-300">Hot or iced</p>
            <div className="flex gap-2">
              {(['any', 'hot', 'cold'] as const).map((t) => (
                <Chip key={t} active={filters.temp === t} onClick={() => setFilters((f) => ({ ...f, temp: t }))}>{t === 'any' ? 'Any' : t === 'hot' ? 'Hot' : 'Iced'}</Chip>
              ))}
            </div>
          </div>
          <Slider label="Max price" min={1000} max={3000} step={100} value={filters.maxPrice}
            onChange={(v) => setFilters((f) => ({ ...f, maxPrice: v }))} format={aed} />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setFilters(EMPTY_FILTERS)}>Clear all</Button>
            <Button className="flex-1" onClick={() => setSheet(false)}>Show {items.length}</Button>
          </div>
        </div>
      </Sheet>
      <MoodSheet open={mood} onClose={() => setMood(false)} items={menu.data?.items ?? []} />
    </>
  );
}

function Reviews({ itemId }: { itemId: string }) {
  const reviews = useQuery({
    queryKey: ['reviews', itemId],
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('id,author_name,rating,body').eq('menu_item_id', itemId).order('created_at', { ascending: false }).limit(10);
      if (error) throw new Error(error.message);
      return data as Array<{ id: string; author_name: string; rating: number; body: string }>;
    },
  });
  if (!reviews.data?.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-2xl">Reviews</h2>
      {reviews.data.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between"><span className="font-semibold">{r.author_name}</span><Rating value={r.rating} size={16} /></div>
          {r.body && <p className="mt-1 break-words text-cream-300">{r.body}</p>}
        </Card>
      ))}
    </section>
  );
}

function Pairing({ itemId }: { itemId: string }) {
  const pairing = useQuery({
    queryKey: ['pairing', itemId],
    queryFn: async () => {
      const { data } = await supabase.from('pairing_stats').select('pair_name,pct').eq('item_id', itemId).order('pct', { ascending: false }).limit(1);
      return (data?.[0] as { pair_name: string; pct: number } | undefined) ?? null;
    },
  });
  if (!pairing.data) return null;
  return <p className="text-sm text-glow-300">{pairing.data.pct}% of students who order this add {withArticle(pairing.data.pair_name)}.</p>;
}

export function ItemDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const add = useCart((s) => s.add);
  const menu = useMenu();
  const groups = useItemOptions(itemId);
  useRealtime([{ table: 'menu_items', keys: [['menu']] }], 'item-live');
  const item = menu.data?.items.find((i) => i.id === itemId);
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  const selected: Option[] = useMemo(
    () => (groups.data ?? []).flatMap((g) => g.options.filter((o) => (chosen[g.id] ?? []).includes(o.id))),
    [groups.data, chosen],
  );
  const missing = (groups.data ?? []).find((g) => g.required && !(chosen[g.id]?.length));

  if (menu.isLoading || groups.isLoading) return <Page><Skeleton className="h-64" /><Skeleton className="h-40" /></Page>;
  if (menu.isError || groups.isError) return <Page><ErrorState onRetry={() => { void menu.refetch(); void groups.refetch(); }} /></Page>;
  if (!item) return <Page><EmptyState title="Item not found" action={<Link to="/menu" className="btn btn-secondary glass">Back to menu</Link>} /></Page>;

  const unit = item.base_price_fils + selected.reduce((s, o) => s + o.price_delta_fils, 0);

  const pick = (groupId: string, kind: string, optionId: string) =>
    setChosen((c) => {
      const cur = c[groupId] ?? [];
      if (kind === 'single') return { ...c, [groupId]: cur[0] === optionId ? [] : [optionId] };
      return { ...c, [groupId]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
    });

  // A shared link opens with no history, so Back goes to the menu.
  const back = () => { if (location.key === 'default') navigate('/menu'); else navigate(-1); };

  return (
    <Page className="lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
      <div className="space-y-3">
        <div className="glass gloss relative grid place-items-center rounded-3xl py-8">
          <div className="absolute h-40 w-40 rounded-full blur-3xl" style={{ background: item.accent_color, opacity: 0.45 }} />
          <div className="absolute left-2 top-2 z-10"><Button variant="icon" aria-label="Back" onClick={back}><ArrowLeft size={20} strokeWidth={1.75} /></Button></div>
          <div className="relative"><DrinkArt kind={item.kind} accent={item.accent_color} name={item.name} imageUrl={item.image_url} size={200} /></div>
        </div>
        <h1 className="h1-gradient text-5xl">{item.name}</h1>
        <p className="text-cream-100">{item.description}</p>
        <div className="flex flex-wrap gap-2">{item.tags.filter((t) => DIETARY.includes(t)).map((t) => <Badge key={t}>{t}</Badge>)}</div>
        <Pairing itemId={item.id} />
        <p className="text-sm text-cream-300">Ask our staff about allergens.</p>
      </div>
      <div className="space-y-4">
        {groups.data?.map((g) => (
          <fieldset key={g.id}>
            <legend className="mb-2 text-sm text-cream-300">{g.name}{g.required ? ' (required)' : ''}</legend>
            <div className="flex flex-wrap gap-2">
              {g.options.filter((o) => o.is_available).map((o) => (
                <Chip key={o.id} active={(chosen[g.id] ?? []).includes(o.id)} onClick={() => pick(g.id, g.kind, o.id)}>
                  {o.name}{o.price_delta_fils > 0 ? ` +${aed(o.price_delta_fils)}` : ''}
                </Chip>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="flex items-center justify-between">
          <Stepper label="Quantity" value={qty} onChange={setQty} />
          <span className="tabular font-display text-3xl font-bold">{aed(unit * qty)}</span>
        </div>
        <Button
          className="w-full"
          disabled={!item.is_available || Boolean(missing)}
          onClick={() => {
            add({
              itemId: item.id, name: item.name, kind: item.kind, accent: item.accent_color, unitFils: unit, qty,
              optionIds: selected.map((o) => o.id), optionNames: selected.map((o) => o.name),
            });
            toast(`${item.name} added`);
            navigate('/menu');
          }}
        >
          {!item.is_available ? 'Sold out' : missing ? `Choose a ${missing.name}` : 'Add to cart'}
        </Button>
        <Reviews itemId={item.id} />
      </div>
    </Page>
  );
}

