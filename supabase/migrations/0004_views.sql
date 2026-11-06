-- Read models.

create view popular_items as
  select oi.menu_item_id, m.name, m.kind, m.accent_color, m.base_price_fils, sum(oi.qty)::int as qty_sold
  from order_items oi
  join orders o on o.id = oi.order_id
  join menu_items m on m.id = oi.menu_item_id
  where o.status = 'completed' and o.placed_at > now() - interval '14 days' and m.is_active
  group by oi.menu_item_id, m.name, m.kind, m.accent_color, m.base_price_fils
  order by qty_sold desc;

-- Share of orders containing an item that also contain a bakery item. Minimum support 5.
create view pairing_stats as
  with base as (
    select oi.menu_item_id as item_id, count(distinct oi.order_id) as orders_with_item
    from order_items oi join orders o on o.id = oi.order_id
    where o.status = 'completed' group by oi.menu_item_id
  ), pair as (
    select a.menu_item_id as item_id, b.menu_item_id as pair_item_id, count(distinct a.order_id) as both_count
    from order_items a
    join order_items b on a.order_id = b.order_id and a.menu_item_id <> b.menu_item_id
    join orders o on o.id = a.order_id
    join menu_items m on m.id = b.menu_item_id and m.kind = 'bakery'
    where o.status = 'completed'
    group by a.menu_item_id, b.menu_item_id
  )
  select p.item_id, p.pair_item_id, m.name as pair_name, p.both_count::int as support,
    round(100.0 * p.both_count / b.orders_with_item)::int as pct
  from pair p join base b on b.item_id = p.item_id join menu_items m on m.id = p.pair_item_id
  where p.both_count >= 5;

create view busy_hours as
  select extract(hour from o.placed_at at time zone 'Asia/Dubai')::int as hour,
    count(*)::int as orders,
    round(avg(extract(epoch from (o.ready_at - o.placed_at))))::int as avg_wait_seconds
  from orders o
  where o.status = 'completed' and o.placed_at > now() - interval '28 days'
  group by 1 order by 1;

create view item_ratings as
  select menu_item_id, round(avg(rating), 1)::float as rating, count(*)::int as review_count
  from reviews where not is_hidden group by menu_item_id;

grant select on popular_items, pairing_stats, busy_hours, item_ratings to authenticated;

create or replace function club_leaderboard() returns table (club_id uuid, name text, meters int, members int)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, coalesce(sum(l.delta), 0)::int, c.member_count
  from clubs c
  left join club_members cm on cm.club_id = c.id
  left join meter_ledger l on l.user_id = cm.user_id
    and (l.created_at at time zone 'Asia/Dubai') >= date_trunc('month', dubai_now())
  group by c.id
  order by 3 desc, c.name
$$;

create or replace function barista_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  return (select jsonb_build_object('orders_today', count(*),
      'avg_prep_seconds', coalesce(round(avg(extract(epoch from (ready_at - preparing_at)))), 0))
    from orders where order_date = dubai_today() and status <> 'cancelled');
end $$;

create or replace function admin_analytics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'sales_by_day', (select coalesce(jsonb_agg(d order by d.day), '[]') from (
      select order_date as day, sum(total_fils - tip_fils)::int as fils, count(*)::int as orders
      from orders where status = 'completed' and placed_at > now() - interval '28 days' group by order_date) d),
    'top_items', (select coalesce(jsonb_agg(t), '[]') from (select name, qty_sold from popular_items limit 8) t),
    'heatmap', (select coalesce(jsonb_agg(h), '[]') from (
      select extract(isodow from placed_at at time zone 'Asia/Dubai')::int as dow,
        extract(hour from placed_at at time zone 'Asia/Dubai')::int as hour, count(*)::int as orders
      from orders where status = 'completed' and placed_at > now() - interval '28 days' group by 1, 2) h),
    'avg_prep_seconds', (select coalesce(round(avg(extract(epoch from (ready_at - preparing_at)))), 0) from orders where status = 'completed'),
    'meters_issued', (select coalesce(sum(delta), 0) from meter_ledger));
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function _price_cart(uuid, jsonb, uuid), _ahead_seconds(timestamptz, uuid) from authenticated;
grant execute on function public_allowed_domains() to anon;
