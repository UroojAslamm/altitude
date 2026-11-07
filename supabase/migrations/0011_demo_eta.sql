-- While the pitch timer is on, the tracker shows a believable 7 to 10 minute wait.
-- The order still reaches Ready on the timer. With the timer at 0 this is the real estimate.
create or replace function queue_info(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o orders;
  ahead int;
  secs int;
  own int;
  baristas int;
  auto int;
  estimate int;
begin
  select * into o from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  select count(*) into ahead from orders
    where status in ('placed', 'preparing') and placed_at < o.placed_at and id <> o.id;
  secs := _ahead_seconds(o.placed_at, o.id);
  select coalesce(sum(m.prep_seconds * oi.qty), 0) into own
    from order_items oi join menu_items m on m.id = oi.menu_item_id where oi.order_id = o.id;
  select barista_count, auto_ready_seconds into baristas, auto from settings;
  estimate := (secs + own) / baristas;
  if auto > 0 then estimate := greatest(estimate, 420 + (o.order_no % 4) * 60); end if;
  return jsonb_build_object('ahead_count', ahead,
    'eta_seconds', case when o.status in ('placed', 'preparing') then estimate else 0 end,
    'estimated_ready_at', o.estimated_ready_at);
end $$;
