-- Drink Lab, rewards, perk vouchers, pitch controls.

create or replace function submit_drink(p_name text, p_description text, p_base_item uuid, p_ingredients text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  this_month date := date_trunc('month', dubai_now())::date;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from drink_submissions where user_id = uid and month = this_month) then
    raise exception 'ALREADY_SUBMITTED';
  end if;
  insert into drink_submissions (user_id, author_name, name, description, base_item_id, ingredients, month)
  values (uid, (select split_part(full_name, ' ', 1) from profiles where id = uid), trim(p_name), coalesce(p_description, ''),
    p_base_item, coalesce(p_ingredients, ''), this_month) returning id into sid;
  return sid;
end $$;

create or replace function vote_drink(p_submission_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from drink_submissions where id = p_submission_id and user_id = uid) then raise exception 'OWN_SUBMISSION'; end if;
  delete from drink_votes where submission_id = p_submission_id and user_id = uid;
  if found then
    update drink_submissions set vote_count = vote_count - 1 where id = p_submission_id;
    return false;
  end if;
  insert into drink_votes (submission_id, user_id) values (p_submission_id, uid);
  update drink_submissions set vote_count = vote_count + 1 where id = p_submission_id;
  return true;
end $$;

create or replace function promote_drink(p_submission_id uuid, p_price_fils int) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d drink_submissions;
  base menu_items;
  new_id uuid;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into d from drink_submissions where id = p_submission_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if d.promoted_item_id is not null then return d.promoted_item_id; end if;
  select * into base from menu_items where id = d.base_item_id;
  insert into menu_items (category_id, name, description, base_price_fils, accent_color, kind, tags, caffeine_level)
  values (coalesce(base.category_id, (select id from menu_categories order by sort limit 1)), d.name, d.description,
    p_price_fils, coalesce(base.accent_color, '#C99A5B'), coalesce(base.kind, 'iced'), coalesce(base.tags, '{}'), coalesce(base.caffeine_level, 0))
  returning id into new_id;
  update drink_submissions set promoted_item_id = new_id where id = p_submission_id;
  return new_id;
end $$;

create or replace function spin_tickets() returns int
language sql stable security definer set search_path = public as $$
  select greatest(
    (select count(*) from orders where user_id = auth.uid() and status = 'completed')::int / 5
    - (select count(*) from spins where user_id = auth.uid())::int, 0)
$$;

create or replace function spin_wheel() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  roll float := random() * 100;
  prize text;
  prize_label text;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform pg_advisory_xact_lock(hashtext('spin' || uid::text));
  if spin_tickets() < 1 then raise exception 'NO_TICKETS'; end if;

  if roll < 35 then prize := 'meters'; prize_label := '+25 meters';
  elsif roll < 60 then prize := 'free_shot'; prize_label := 'Free extra shot';
  elsif roll < 80 then prize := 'percent'; prize_label := '10% off';
  elsif roll < 90 then prize := 'free_croissant'; prize_label := 'Free croissant';
  elsif roll < 99 then prize := 'none'; prize_label := 'Try again';
  else prize := 'free_drink'; prize_label := 'Free drink';
  end if;

  insert into spins (user_id, prize_kind) values (uid, prize);
  if prize = 'meters' then
    insert into meter_ledger (user_id, delta, reason) values (uid, 25, 'spin');
    update profiles set total_meters = total_meters + 25 where id = uid;
  elsif prize <> 'none' then
    insert into vouchers (user_id, kind, value, label, source, expires_at)
    values (uid, prize, case when prize = 'percent' then 10 else 0 end, prize_label, 'spin', now() + interval '14 days');
  end if;
  return jsonb_build_object('prize', prize, 'label', prize_label, 'tickets_left', spin_tickets());
end $$;

-- Idempotent perk vouchers, called when the app opens.
create or replace function issue_perk_vouchers() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p profiles;
  today date := dubai_today();
  year_tag text := 'birthday:' || extract(year from dubai_today());
  month_tag text := 'peak:' || to_char(dubai_today(), 'YYYY-MM');
begin
  select * into p from profiles where id = uid;
  if not found then return; end if;
  if p.birth_month = extract(month from today) and p.birth_day = extract(day from today)
     and not exists (select 1 from vouchers where user_id = uid and source = year_tag) then
    insert into vouchers (user_id, kind, label, source, expires_at)
    values (uid, 'mystery', 'Birthday Mystery Cup', year_tag, now() + interval '14 days');
  end if;
  if tier_for(p.total_meters) = 'peak' and not exists (select 1 from vouchers where user_id = uid and source = month_tag) then
    insert into vouchers (user_id, kind, label, source, expires_at)
    values (uid, 'free_drink', 'Peak monthly free drink', month_tag,
      (date_trunc('month', dubai_now()) + interval '1 month') at time zone 'Asia/Dubai');
  end if;
end $$;

-- Pitch controls (admin only).
create or replace function demo_reset() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  update vouchers set used_order_id = null where used_order_id in (select id from orders where not is_seed);
  delete from orders where not is_seed;
  update settings set accepting_orders = true, seat_status = 'plenty';
  update menu_items set is_available = true where is_active;
end $$;

create or replace function demo_create_sample_order() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it menu_items;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into it from menu_items m where m.is_active and m.is_available
    and not exists (select 1 from item_option_groups ig join option_groups g on g.id = ig.group_id
                    where ig.item_id = m.id and g.required)
    order by random() limit 1;
  return place_order(jsonb_build_array(jsonb_build_object('item_id', it.id, 'qty', 1, 'option_ids', '[]'::jsonb)),
    'pickup', true, 'Sample order', 0, null, gen_random_uuid());
end $$;

create or replace function demo_jump_ready(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  update orders set status = 'ready', preparing_at = coalesce(preparing_at, now()), ready_at = now()
    where id = p_order_id and status in ('placed', 'preparing');
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function _price_cart(uuid, jsonb, uuid), _ahead_seconds(timestamptz, uuid) from authenticated;
grant execute on function public_allowed_domains() to anon;
