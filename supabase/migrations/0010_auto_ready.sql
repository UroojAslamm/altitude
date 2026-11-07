-- Pitch timer: an order moves on by itself, so a demo never waits on the counter.
-- Set auto_ready_seconds to 0 to leave every order to the barista.
alter table settings add column if not exists auto_ready_seconds int not null default 15
  check (auto_ready_seconds between 0 and 600);

-- Time comes from the database, so calling this early changes nothing.
create or replace function auto_advance_orders() returns int
language plpgsql security definer set search_path = public as $$
declare
  secs int := (select auto_ready_seconds from settings);
  staff uuid := (select id from profiles where role = 'barista' order by created_at limit 1);
  moved int;
  started int;
begin
  if coalesce(secs, 0) = 0 then return 0; end if;
  update orders set status = 'ready', preparing_at = coalesce(preparing_at, now()), ready_at = now(),
    prepared_by = coalesce(prepared_by, staff),
    prepared_by_name = coalesce(prepared_by_name, _first_name(staff))
    where status in ('placed', 'preparing') and placed_at <= now() - make_interval(secs => secs);
  get diagnostics moved = row_count;
  update orders set status = 'preparing', preparing_at = now(),
    prepared_by = staff, prepared_by_name = _first_name(staff)
    where status = 'placed' and placed_at <= now() - make_interval(secs => secs / 3.0);
  get diagnostics started = row_count;
  return moved + started;
end $$;

create or replace function queue_info(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o orders;
  ahead int;
  secs int;
  own int;
  baristas int;
  auto int;
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
  return jsonb_build_object('ahead_count', ahead,
    'eta_seconds', case
      when o.status not in ('placed', 'preparing') then 0
      when auto > 0 then greatest(0, auto - extract(epoch from now() - o.placed_at)::int)
      else (secs + own) / baristas end,
    'estimated_ready_at', o.estimated_ready_at);
end $$;

revoke execute on function auto_advance_orders() from public, anon;
grant execute on function auto_advance_orders() to authenticated;
