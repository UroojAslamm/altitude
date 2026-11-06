-- Pricing, ordering, status, meters. All business rules live here.

create or replace function tier_for(meters int) returns text
language sql stable security definer set search_path = public as $$
  select case
    when meters >= (tier_thresholds ->> 'peak')::int then 'peak'
    when meters >= (tier_thresholds ->> 'summit')::int then 'summit'
    when meters >= (tier_thresholds ->> 'ridge')::int then 'ridge'
    else 'base_camp' end
  from settings
$$;

create or replace function squad_level(p_squad uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when q.squad_meters >= (s.squad_levels ->> 'l3')::int then 3
      when q.squad_meters >= (s.squad_levels ->> 'l2')::int then 2
      else 1 end
    from squads q, settings s where q.id = p_squad), 0)
$$;

create or replace function cafe_is_open() returns boolean
language sql stable security definer set search_path = public as $$
  select demo_always_open or (
    extract(isodow from dubai_now())::int = any (days_open)
    and dubai_now()::time between open_time and close_time)
  from settings
$$;

-- Prices a cart from database rows only. Raises coded errors for bad input.
-- p_items: [{ "item_id": uuid, "qty": int, "option_ids": [uuid] }]
create or replace function _price_cart(p_uid uuid, p_items jsonb, p_voucher uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  prof profiles;
  tier text;
  sq_level int;
  is_friday boolean := extract(isodow from dubai_now())::int = 5;
  line jsonb;
  it menu_items;
  opt options;
  grp option_groups;
  dotm_price int;
  qty int;
  unit int;
  lines jsonb := '[]';
  opts jsonb;
  opt_ids uuid[];
  subtotal int := 0;
  free_shot int := 0;
  shot_price int := 0;
  max_drink int := 0;
  max_bakery int := 0;
  discount int := 0;
  label text := null;
  cand int;
  promo promos;
  item_total int;
  v vouchers;
  voucher_won boolean := false;
begin
  select * into prof from profiles where id = p_uid;
  tier := tier_for(prof.total_meters);
  sq_level := squad_level(prof.squad_id);

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  for line in select * from jsonb_array_elements(p_items) loop
    qty := (line ->> 'qty')::int;
    if qty is null or qty < 1 or qty > 20 then raise exception 'BAD_QUANTITY'; end if;

    select * into it from menu_items where id = (line ->> 'item_id')::uuid;
    if not found or not it.is_active or not it.is_available then
      raise exception 'ITEM_UNAVAILABLE:%', coalesce(it.name, 'item');
    end if;

    select special_price_fils into dotm_price from drink_of_month
      where menu_item_id = it.id and is_active and special_price_fils is not null;
    unit := coalesce(dotm_price, it.base_price_fils);

    opt_ids := array(select (jsonb_array_elements_text(coalesce(line -> 'option_ids', '[]'))) ::uuid);
    opts := '[]';
    for opt in select o.* from options o where o.id = any (opt_ids) loop
      if not opt.is_available then raise exception 'OPTION_UNAVAILABLE:%', opt.name; end if;
      if not exists (select 1 from item_option_groups g where g.item_id = it.id and g.group_id = opt.group_id) then
        raise exception 'OPTION_INVALID:%', opt.name;
      end if;
      unit := unit + opt.price_delta_fils;
      opts := opts || jsonb_build_object('id', opt.id, 'name', opt.name, 'price_delta_fils', opt.price_delta_fils);
      if opt.is_extra_shot and opt.price_delta_fils > shot_price then shot_price := opt.price_delta_fils; end if;
    end loop;
    if cardinality(opt_ids) <> jsonb_array_length(opts) then raise exception 'OPTION_INVALID:unknown'; end if;

    for grp in select g.* from option_groups g join item_option_groups ig on ig.group_id = g.id where ig.item_id = it.id loop
      cand := (select count(*) from options o where o.group_id = grp.id and o.id = any (opt_ids));
      if grp.required and cand = 0 then raise exception 'OPTION_REQUIRED:%', grp.name; end if;
      if grp.kind = 'single' and cand > 1 then raise exception 'OPTION_INVALID:%', grp.name; end if;
    end loop;

    subtotal := subtotal + unit * qty;
    if it.kind = 'bakery' then max_bakery := greatest(max_bakery, unit);
    else max_drink := greatest(max_drink, unit); end if;
    lines := lines || jsonb_build_object('item_id', it.id, 'name', it.name, 'unit_price_fils', unit, 'qty', qty,
      'options', opts, 'prep_seconds', it.prep_seconds, 'kind', it.kind);
  end loop;

  -- Free extra shot: one per order, stacks with discounts.
  if tier <> 'base_camp' or (sq_level >= 2 and is_friday) then
    free_shot := shot_price;
  end if;
  subtotal := subtotal - free_shot;

  -- Single best discount.
  if tier = 'peak' then
    discount := subtotal * 10 / 100; label := 'Peak member 10%';
  elsif tier = 'summit' then
    discount := subtotal * 5 / 100; label := 'Summit member 5%';
  end if;

  if sq_level >= 3 and subtotal * 5 / 100 > discount then
    discount := subtotal * 5 / 100; label := 'Squad level 3, 5%';
  end if;

  for promo in select * from promos where is_active and kind in ('percent', 'amount') and now() between starts_at and ends_at loop
    if promo.applies_to_item_id is null then
      item_total := subtotal;
    else
      item_total := coalesce((select sum((l ->> 'unit_price_fils')::int * (l ->> 'qty')::int) from jsonb_array_elements(lines) l
        where (l ->> 'item_id')::uuid = promo.applies_to_item_id), 0);
    end if;
    if item_total > 0 then
      cand := case when promo.kind = 'percent' then item_total * promo.value / 100 else least(promo.value, item_total) end;
      if cand > discount then discount := cand; label := promo.title; end if;
    end if;
  end loop;

  if p_voucher is not null then
    select * into v from vouchers where id = p_voucher and user_id = p_uid;
    if not found or v.used_order_id is not null or v.expires_at < now() then
      raise exception 'VOUCHER_INVALID';
    end if;
    cand := case v.kind
      when 'percent' then subtotal * v.value / 100
      when 'free_drink' then max_drink
      when 'mystery' then max_drink
      when 'free_croissant' then max_bakery
      when 'free_shot' then case when free_shot > 0 then 0 else shot_price end
      else 0 end;
    if cand > discount then discount := cand; label := v.label; voucher_won := true; end if;
  end if;

  discount := least(discount, subtotal);

  return jsonb_build_object('lines', lines, 'subtotal_fils', subtotal + free_shot, 'free_shot_fils', free_shot,
    'discount_fils', discount, 'discount_label', label, 'voucher_applied', voucher_won,
    'total_fils', subtotal - discount);
end $$;

-- Checkout preview: same engine as place_order.
create or replace function price_preview(p_items jsonb, p_voucher uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return _price_cart(auth.uid(), p_items, p_voucher);
end $$;

create or replace function _ahead_seconds(p_before timestamptz, p_order uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(m.prep_seconds * oi.qty), 0)::int
  from orders o
  join order_items oi on oi.order_id = o.id
  join menu_items m on m.id = oi.menu_item_id
  where o.status in ('placed', 'preparing') and o.placed_at < p_before and o.id <> p_order
$$;

create or replace function place_order(
  p_items jsonb, p_payment_method text, p_dine_in boolean, p_notes text,
  p_tip_fils int, p_voucher_id uuid, p_client_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s settings;
  existing orders;
  priced jsonb;
  day date := dubai_today();
  no int;
  oid uuid := gen_random_uuid();
  name text;
  line jsonb;
  own_seconds int;
  total int;
  ts timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_client_request_id is null then raise exception 'MISSING_REQUEST_ID'; end if;

  -- Serialize double taps on the same request id.
  perform pg_advisory_xact_lock(hashtext(p_client_request_id::text));
  select * into existing from orders where client_request_id = p_client_request_id;
  if found then
    if existing.user_id <> uid then raise exception 'FORBIDDEN'; end if;
    return jsonb_build_object('order_id', existing.id, 'order_no', existing.order_no, 'duplicate', true);
  end if;

  select * into s from settings;
  if not s.accepting_orders then raise exception 'NOT_ACCEPTING'; end if;
  if not cafe_is_open() then raise exception 'CLOSED'; end if;
  if p_payment_method not in ('demo_card', 'pickup') then raise exception 'BAD_PAYMENT'; end if;
  if coalesce(p_tip_fils, 0) < 0 or coalesce(p_tip_fils, 0) > 10000 then raise exception 'BAD_TIP'; end if;
  if char_length(coalesce(p_notes, '')) > 140 then raise exception 'NOTE_TOO_LONG'; end if;

  priced := _price_cart(uid, p_items, p_voucher_id);

  insert into order_counters as c (order_date, last_no) values (day, 1)
    on conflict (order_date) do update set last_no = c.last_no + 1
    returning last_no into no;

  select split_part(full_name, ' ', 1) into name from profiles where id = uid;
  total := (priced ->> 'total_fils')::int + coalesce(p_tip_fils, 0);

  own_seconds := (select coalesce(sum((l ->> 'prep_seconds')::int * (l ->> 'qty')::int), 0)
    from jsonb_array_elements(priced -> 'lines') l);

  insert into orders (id, order_no, order_date, user_id, customer_name, dine_in, payment_method, payment_status,
    subtotal_fils, free_shot_fils, discount_fils, discount_label, tip_fils, total_fils, notes, voucher_id,
    client_request_id, placed_at, estimated_ready_at)
  values (oid, no, day, uid, coalesce(name, ''), coalesce(p_dine_in, false), p_payment_method,
    case when p_payment_method = 'demo_card' then 'paid' else 'unpaid' end,
    (priced ->> 'subtotal_fils')::int, (priced ->> 'free_shot_fils')::int, (priced ->> 'discount_fils')::int,
    priced ->> 'discount_label', coalesce(p_tip_fils, 0), total, nullif(trim(p_notes), ''),
    case when (priced ->> 'voucher_applied')::boolean then p_voucher_id end,
    p_client_request_id, ts,
    ts + make_interval(secs => (_ahead_seconds(ts, oid) + own_seconds)::numeric / s.barista_count));

  for line in select * from jsonb_array_elements(priced -> 'lines') loop
    insert into order_items (order_id, menu_item_id, name_snapshot, unit_price_fils, qty, options_snapshot)
    values (oid, (line ->> 'item_id')::uuid, line ->> 'name', (line ->> 'unit_price_fils')::int,
      (line ->> 'qty')::int, line -> 'options');
  end loop;

  if (priced ->> 'voucher_applied')::boolean then
    update vouchers set used_order_id = oid where id = p_voucher_id;
  end if;

  return jsonb_build_object('order_id', oid, 'order_no', no, 'duplicate', false);
end $$;

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
    update orders set status = 'preparing', preparing_at = now() where id = p_order_id;
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
    update orders set status = 'placed', preparing_at = null where id = p_order_id;
    return jsonb_build_object('status', 'placed');
  elsif o.status = 'ready' then
    update orders set status = 'preparing', ready_at = null where id = p_order_id;
    return jsonb_build_object('status', 'preparing');
  end if;
  raise exception 'ILLEGAL_TRANSITION';
end $$;

create or replace function cancel_order(p_order_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = 'cancelled' then return jsonb_build_object('status', 'cancelled', 'already_updated', true); end if;
  if o.status = 'completed' then raise exception 'ILLEGAL_TRANSITION'; end if;
  if is_staff() then
    if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  elsif o.user_id <> auth.uid() or o.status <> 'placed' then
    raise exception 'FORBIDDEN';
  end if;
  update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = p_order_id;
  update vouchers set used_order_id = null where used_order_id = p_order_id;
  return jsonb_build_object('status', 'cancelled', 'already_updated', false);
end $$;

create or replace function complete_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders;
  s settings;
  base int;
  mult int := 1;
  earned int;
  placed timestamp;
  buyer profiles;
  tier_before text;
  tier_after text;
  mate record;
  today date := dubai_today();
  used int;
  bonus int;
  bonus_total int := 0;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not is_staff() and not (o.user_id = auth.uid() and o.status in ('ready', 'completed')) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status = 'completed' then
    return coalesce(o.meter_breakdown, '{}') || jsonb_build_object('already_updated', true);
  end if;
  if o.status <> 'ready' then raise exception 'ILLEGAL_TRANSITION'; end if;

  select * into s from settings;
  base := (o.total_fils - o.tip_fils) / 100;
  placed := o.placed_at at time zone 'Asia/Dubai';
  if extract(isodow from placed)::int = any (s.common_hour_days)
     and placed::time >= s.common_hour_start and placed::time < s.common_hour_end then
    mult := s.common_hour_multiplier;
  end if;
  earned := base * mult;

  select * into buyer from profiles where id = o.user_id for update;
  tier_before := tier_for(buyer.total_meters);

  insert into meter_ledger (user_id, order_id, delta, reason) values (o.user_id, o.id, earned, 'order')
    on conflict do nothing;
  update profiles set total_meters = total_meters + earned where id = o.user_id;
  tier_after := tier_for(buyer.total_meters + earned);

  if buyer.squad_id is not null then
    update squads set squad_meters = squad_meters + earned where id = buyer.squad_id;
    for mate in select p.id from squad_members m join profiles p on p.id = m.user_id
                where m.squad_id = buyer.squad_id and m.user_id <> o.user_id loop
      insert into squad_bonus_log (user_id, day, meters) values (mate.id, today, 0)
        on conflict (user_id, day) do nothing;
      select meters into used from squad_bonus_log where user_id = mate.id and day = today for update;
      bonus := least(earned * s.squad_bonus_pct / 100, greatest(s.squad_bonus_daily_cap - used, 0));
      if bonus > 0 then
        update squad_bonus_log set meters = meters + bonus where user_id = mate.id and day = today;
        insert into meter_ledger (user_id, order_id, delta, reason) values (mate.id, o.id, bonus, 'squad_bonus')
          on conflict do nothing;
        update profiles set total_meters = total_meters + bonus where id = mate.id;
        bonus_total := bonus_total + bonus;
      end if;
    end loop;
  end if;

  update orders set status = 'completed', completed_at = now(), meters_awarded = earned,
    payment_status = 'paid',
    meter_breakdown = jsonb_build_object('base', base, 'multiplier', mult, 'earned', earned,
      'squad_bonus_shared', bonus_total, 'total_meters', buyer.total_meters + earned,
      'tier_before', tier_before, 'tier_after', tier_after, 'tier_changed', tier_before <> tier_after)
  where id = o.id
  returning meter_breakdown into strict o.meter_breakdown;

  return o.meter_breakdown || jsonb_build_object('already_updated', false);
end $$;

create or replace function queue_info(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o orders;
  ahead int;
  secs int;
  own int;
  baristas int;
begin
  select * into o from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  select count(*) into ahead from orders
    where status in ('placed', 'preparing') and placed_at < o.placed_at and id <> o.id;
  secs := _ahead_seconds(o.placed_at, o.id);
  select coalesce(sum(m.prep_seconds * oi.qty), 0) into own
    from order_items oi join menu_items m on m.id = oi.menu_item_id where oi.order_id = o.id;
  select barista_count into baristas from settings;
  return jsonb_build_object('ahead_count', ahead,
    'eta_seconds', case when o.status in ('placed', 'preparing') then (secs + own) / baristas else 0 end,
    'estimated_ready_at', o.estimated_ready_at);
end $$;

-- Barista-limited writes.
create or replace function set_item_available(p_item_id uuid, p_available boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  update menu_items set is_available = p_available where id = p_item_id;
end $$;

create or replace function set_seat_status(p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  update settings set seat_status = p_status;
end $$;

create or replace function set_accepting_orders(p_accepting boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  update settings set accepting_orders = p_accepting;
end $$;

create or replace function public_allowed_domains() returns text[]
language sql stable security definer set search_path = public as $$
  select allowed_domains from settings
$$;

alter publication supabase_realtime add table orders, menu_items, settings;
alter table orders replica identity full;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function _price_cart(uuid, jsonb, uuid), _ahead_seconds(timestamptz, uuid) from authenticated;
grant execute on function public_allowed_domains() to anon;
