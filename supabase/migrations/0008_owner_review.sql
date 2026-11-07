-- Owner review pass: who prepared the order, tips after ordering, Common Hour 12 to 1,
-- public social links for the landing page, and no more birthday vouchers.

alter table orders
  add column prepared_by uuid references profiles (id) on delete set null,
  add column prepared_by_name text;

alter table settings alter column common_hour_start set default '12:00';
alter table settings alter column common_hour_end set default '13:00';
update settings set common_hour_start = '12:00', common_hour_end = '13:00', accepting_orders = true;
update announcements set body = replace(body, '2 to 4 PM', '12 to 1 PM');

-- Students see this name, so the demo barista needs a person's name, not the cafe's.
update profiles set full_name = 'Sara Demo' where email = 'barista@altitude.demo';

create or replace function _first_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select split_part(full_name, ' ', 1) from profiles where id = p_user
$$;

create or replace function advance_order(p_order_id uuid, p_to_status order_status) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders;
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = p_to_status then return jsonb_build_object('status', o.status, 'already_updated', true); end if;
  if o.status = 'placed' and p_to_status = 'preparing' then
    update orders set status = 'preparing', preparing_at = now(),
      prepared_by = auth.uid(), prepared_by_name = _first_name(auth.uid())
      where id = p_order_id;
  elsif o.status = 'preparing' and p_to_status = 'ready' then
    update orders set status = 'ready', ready_at = now() where id = p_order_id;
  else
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  return jsonb_build_object('status', p_to_status, 'already_updated', false);
end $$;

create or replace function undo_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders;
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = 'preparing' then
    update orders set status = 'placed', preparing_at = null, prepared_by = null, prepared_by_name = null
      where id = p_order_id;
    return jsonb_build_object('status', 'placed');
  elsif o.status = 'ready' then
    update orders set status = 'preparing', ready_at = null where id = p_order_id;
    return jsonb_build_object('status', 'preparing');
  end if;
  raise exception 'ILLEGAL_TRANSITION';
end $$;

create or replace function demo_jump_ready(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  staff uuid := (select id from profiles where role = 'barista' order by created_at limit 1);
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  update orders set status = 'ready', preparing_at = coalesce(preparing_at, now()), ready_at = now(),
    prepared_by = coalesce(prepared_by, staff),
    prepared_by_name = coalesce(prepared_by_name, _first_name(staff))
    where id = p_order_id and status in ('placed', 'preparing');
end $$;

-- A tip after the barista is known. One tip per order, inside the same limit as checkout.
-- Meters exclude tips, so complete_order needs no change.
create or replace function tip_order(p_order_id uuid, p_tip_fils int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.user_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if o.status not in ('preparing', 'ready', 'completed') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if o.tip_fils > 0 then raise exception 'ALREADY_TIPPED'; end if;
  if coalesce(p_tip_fils, 0) <= 0 or p_tip_fils > 10000 then raise exception 'BAD_TIP'; end if;
  update orders set tip_fils = p_tip_fils, total_fils = total_fils + p_tip_fils where id = p_order_id;
  return jsonb_build_object('tip_fils', p_tip_fils);
end $$;

-- The landing page is public, and settings are not. Only these links are exposed.
create or replace function public_social_links() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'facebook', nullif(social_links ->> 'facebook', ''),
    'instagram', nullif(social_links ->> 'instagram', ''),
    'google', nullif(social_links ->> 'google', '')))
  from settings
$$;

create or replace function issue_perk_vouchers() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p profiles;
  month_tag text := 'peak:' || to_char(dubai_today(), 'YYYY-MM');
begin
  select * into p from profiles where id = uid;
  if not found then return; end if;
  if tier_for(p.total_meters) = 'peak' and not exists (select 1 from vouchers where user_id = uid and source = month_tag) then
    insert into vouchers (user_id, kind, label, source, expires_at)
    values (uid, 'free_drink', 'Peak monthly free drink', month_tag,
      (date_trunc('month', dubai_now()) + interval '1 month') at time zone 'Asia/Dubai');
  end if;
end $$;

delete from vouchers where source like 'birthday:%' and used_order_id is null;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function _price_cart(uuid, jsonb, uuid), _ahead_seconds(timestamptz, uuid), _first_name(uuid) from authenticated;
grant execute on function public_allowed_domains(), public_social_links() to anon;
