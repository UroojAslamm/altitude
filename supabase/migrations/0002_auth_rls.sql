-- Role helpers, auth triggers, RLS policies, and grants.

create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('barista', 'admin'), false)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'admin', false)
$$;

create or replace function dubai_now() returns timestamp
language sql stable as $$ select now() at time zone 'Asia/Dubai' $$;

create or replace function dubai_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Dubai')::date $$;

-- Signup domain gate plus profile creation.
create or replace function enforce_email_domain() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  domain text := lower(split_part(new.email, '@', 2));
begin
  if not exists (select 1 from settings where domain = any (allowed_domains)) then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED';
  end if;
  return new;
end $$;

create trigger auth_users_domain before insert on auth.users
  for each row execute function enforce_email_domain();

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger auth_users_profile after insert on auth.users
  for each row execute function handle_new_user();

-- RLS on every table.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or is_staff());
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on profiles for update to authenticated
  using (is_admin()) with check (is_admin());

-- Readable catalog tables, admin writes.
create policy settings_read on settings for select to authenticated using (true);
create policy settings_admin on settings for update to authenticated using (is_admin()) with check (is_admin());

do $$
declare t text;
begin
  foreach t in array array['menu_categories', 'menu_items', 'option_groups', 'options', 'item_option_groups',
                           'promos', 'announcements', 'drink_of_month', 'clubs'] loop
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_read', t);
    execute format('create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())', t || '_admin', t);
  end loop;
end $$;

-- Orders: read only, writes through RPC.
create policy orders_read on orders for select to authenticated
  using (user_id = auth.uid() or is_staff());
create policy order_items_read on order_items for select to authenticated
  using (is_staff() or exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));

-- Own-row reads, RPC writes.
create policy meter_ledger_read on meter_ledger for select to authenticated using (user_id = auth.uid());
create policy vouchers_read on vouchers for select to authenticated using (user_id = auth.uid() or is_staff());
create policy spins_read on spins for select to authenticated using (user_id = auth.uid());
create policy favorites_read on favorites for select to authenticated using (user_id = auth.uid());
create policy club_members_read on club_members for select to authenticated using (user_id = auth.uid() or is_admin());
create policy event_rsvps_read on event_rsvps for select to authenticated using (user_id = auth.uid());
create policy drink_votes_read on drink_votes for select to authenticated using (user_id = auth.uid());
create policy squad_members_read on squad_members for select to authenticated using (user_id = auth.uid());
create policy squads_read on squads for select to authenticated
  using (id = (select squad_id from profiles where id = auth.uid()));

-- Reviews, events, Drink Lab.
create policy reviews_read on reviews for select to authenticated using (not is_hidden or is_admin());
create policy reviews_admin on reviews for update to authenticated using (is_admin()) with check (is_admin());
create policy events_read on events for select to authenticated
  using (status = 'approved' or is_admin() or created_by = auth.uid());
create policy events_admin on events for update to authenticated using (is_admin()) with check (is_admin());
create policy drink_submissions_read on drink_submissions for select to authenticated
  using (not is_hidden or is_admin());
create policy drink_submissions_admin on drink_submissions for update to authenticated
  using (is_admin()) with check (is_admin());

-- Grants: strip the defaults, then grant only what the policies need.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
revoke select on order_counters, squad_bonus_log from authenticated;

grant update (full_name, birth_month, birth_day) on profiles to authenticated;
grant update on settings to authenticated;
grant insert, update, delete on menu_categories, menu_items, option_groups, options, item_option_groups,
  promos, announcements, drink_of_month, clubs to authenticated;
grant update (is_hidden) on reviews, drink_submissions to authenticated;
grant update (status) on events to authenticated;

alter default privileges in schema public revoke execute on functions from public;
