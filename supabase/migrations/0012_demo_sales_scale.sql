-- The seeded history adds up to far more than a campus cafe's month, so analytics counts
-- about a fifth of it. Sales and orders scale together, so the average order stays believable.
-- Real orders count in full, and no rows change.
create or replace function admin_analytics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'sales_by_day', (select coalesce(jsonb_agg(d order by d.day), '[]') from (
      select order_date as day,
        round(sum((total_fils - tip_fils) * case when is_seed then 0.205 else 1 end))::int as fils,
        round(sum(case when is_seed then 0.205 else 1 end))::int as orders
      from orders where status = 'completed' and placed_at > now() - interval '28 days' group by order_date) d),
    'top_items', (select coalesce(jsonb_agg(t), '[]') from (select name, qty_sold from popular_items limit 8) t),
    'heatmap', (select coalesce(jsonb_agg(h), '[]') from (
      select extract(isodow from placed_at at time zone 'Asia/Dubai')::int as dow,
        extract(hour from placed_at at time zone 'Asia/Dubai')::int as hour, count(*)::int as orders
      from orders where status = 'completed' and placed_at > now() - interval '28 days' group by 1, 2) h),
    'avg_prep_seconds', (select coalesce(round(avg(extract(epoch from (ready_at - preparing_at)))), 0) from orders where status = 'completed'),
    'meters_issued', (select coalesce(sum(delta), 0) from meter_ledger));
end $$;
