import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Category, MenuItem, Option, OptionGroup, Order, Settings, Voucher } from './types';

const unwrap = <T,>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
};

export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const [cats, items, ratings] = await Promise.all([
        supabase.from('menu_categories').select('*').order('sort'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort'),
        supabase.from('item_ratings').select('*'),
      ]);
      const ratingMap = new Map(
        unwrap(ratings as never as { data: Array<{ menu_item_id: string; rating: number; review_count: number }>; error: null }).map((r) => [r.menu_item_id, r]),
      );
      return {
        categories: unwrap(cats) as Category[],
        items: unwrap(items) as MenuItem[],
        ratings: ratingMap,
      };
    },
  });
}

export function useItemOptions(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-options', itemId],
    enabled: Boolean(itemId),
    queryFn: async () => {
      const links = unwrap(await supabase.from('item_option_groups').select('group_id').eq('item_id', itemId!)) as Array<{ group_id: string }>;
      const ids = links.map((l) => l.group_id);
      if (ids.length === 0) return [] as OptionGroup[];
      const [groups, options] = await Promise.all([
        supabase.from('option_groups').select('*').in('id', ids).order('sort'),
        supabase.from('options').select('*').in('group_id', ids).order('sort'),
      ]);
      const opts = unwrap(options) as Option[];
      return (unwrap(groups) as Array<Omit<OptionGroup, 'options'>>).map((g) => ({
        ...g, options: opts.filter((o) => o.group_id === g.id),
      }));
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    refetchInterval: 15_000,
    queryFn: async () => unwrap(await supabase.from('settings').select('*').single()) as Settings,
  });
}

const ORDER_SELECT = '*, order_items(*)';

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: Boolean(id),
    refetchInterval: 15_000,
    queryFn: async () => unwrap(await supabase.from('orders').select(ORDER_SELECT).eq('id', id!).single()) as Order,
  });
}

export function useMyOrders(uid: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ['orders', uid, limit],
    enabled: Boolean(uid),
    refetchInterval: 15_000,
    queryFn: async () =>
      unwrap(await supabase.from('orders').select(ORDER_SELECT).eq('user_id', uid!).order('placed_at', { ascending: false }).limit(limit)) as Order[],
  });
}

export function useQueueInfo(orderId: string | undefined, active: boolean) {
  return useQuery({
    queryKey: ['queue', orderId],
    enabled: Boolean(orderId) && active,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('queue_info', { p_order_id: orderId });
      if (error) throw new Error(error.message);
      return data as { ahead_count: number; eta_seconds: number; estimated_ready_at: string | null };
    },
  });
}

export function useVouchers(uid: string | undefined) {
  return useQuery({
    queryKey: ['vouchers', uid],
    enabled: Boolean(uid),
    queryFn: async () =>
      unwrap(await supabase.from('vouchers').select('*').is('used_order_id', null).gt('expires_at', new Date().toISOString()).order('expires_at')) as Voucher[],
  });
}

/** Realtime invalidation with reconnect status. Polling in each query is the fallback. */
export function useRealtime(tables: Array<{ table: string; filter?: string; keys: string[][] }>, name: string) {
  const client = useQueryClient();
  const [online, setOnline] = useState(true);
  const signature = JSON.stringify(tables);
  useEffect(() => {
    let channel = supabase.channel(name);
    for (const t of tables) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: t.table, ...(t.filter ? { filter: t.filter } : {}) } as never,
        (() => { for (const key of t.keys) void client.invalidateQueries({ queryKey: key }); }) as never,
      );
    }
    channel.subscribe((status) => {
      const ok = status === 'SUBSCRIBED';
      setOnline(ok);
      if (ok) for (const t of tables) for (const key of t.keys) void client.invalidateQueries({ queryKey: key });
    });
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, name, client]);
  return online;
}
