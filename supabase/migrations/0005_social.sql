-- Squads, favorites, reviews, clubs, events.

create or replace function squad_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  sid uuid;
  q squads;
begin
  select squad_id into sid from profiles where id = auth.uid();
  if sid is null then return null; end if;
  select * into q from squads where id = sid;
  return jsonb_build_object('id', q.id, 'name', q.name, 'code', q.code, 'created_by', q.created_by,
    'squad_meters', q.squad_meters, 'level', squad_level(q.id),
    'levels', (select squad_levels from settings),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name, 'meters', p.total_meters) order by p.total_meters desc), '[]')
      from squad_members m join profiles p on p.id = m.user_id where m.squad_id = sid));
end $$;

create or replace function create_squad(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_code text;
  sid uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from squad_members where user_id = uid) then raise exception 'ALREADY_IN_SQUAD'; end if;
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from squads where code = new_code);
  end loop;
  insert into squads (name, code, created_by) values (trim(p_name), new_code, uid) returning id into sid;
  insert into squad_members (squad_id, user_id) values (sid, uid);
  update profiles set squad_id = sid where id = uid;
  return squad_overview();
end $$;

create or replace function join_squad(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from squad_members where user_id = uid) then raise exception 'ALREADY_IN_SQUAD'; end if;
  select id into sid from squads where code = upper(trim(p_code)) for update;
  if sid is null then raise exception 'SQUAD_NOT_FOUND'; end if;
  if (select count(*) from squad_members where squad_id = sid) >= 6 then raise exception 'SQUAD_FULL'; end if;
  insert into squad_members (squad_id, user_id) values (sid, uid);
  update profiles set squad_id = sid where id = uid;
  return squad_overview();
end $$;

create or replace function leave_squad() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  select squad_id into sid from profiles where id = uid;
  delete from squad_members where user_id = uid;
  update profiles set squad_id = null where id = uid;
  if sid is not null and not exists (select 1 from squad_members where squad_id = sid) then
    delete from squads where id = sid;
  end if;
end $$;

create or replace function remove_squad_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  select id into sid from squads where created_by = auth.uid()
    and id = (select squad_id from profiles where id = auth.uid());
  if sid is null or p_user_id = auth.uid() then raise exception 'FORBIDDEN'; end if;
  delete from squad_members where squad_id = sid and user_id = p_user_id;
  update profiles set squad_id = null where id = p_user_id and squad_id = sid;
end $$;

create or replace function toggle_favorite(p_item_id uuid, p_options jsonb default '[]') returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from favorites where user_id = uid and menu_item_id = p_item_id;
  if found then return false; end if;
  insert into favorites (user_id, menu_item_id, options_snapshot) values (uid, p_item_id, coalesce(p_options, '[]'));
  return true;
end $$;

create or replace function submit_review(p_item_id uuid, p_rating int, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from orders o join order_items oi on oi.order_id = o.id
                 where o.user_id = uid and o.status = 'completed' and oi.menu_item_id = p_item_id) then
    raise exception 'REVIEW_NEEDS_ORDER';
  end if;
  insert into reviews (user_id, author_name, menu_item_id, rating, body)
  values (uid, (select split_part(full_name, ' ', 1) from profiles where id = uid), p_item_id, p_rating, coalesce(trim(p_body), ''))
  on conflict (user_id, menu_item_id) do update set rating = excluded.rating, body = excluded.body;
end $$;

create or replace function join_club(p_club_id uuid, p_join boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_join then
    if (select count(*) from club_members where user_id = uid) >= 3 then raise exception 'CLUB_LIMIT'; end if;
    insert into club_members (club_id, user_id) values (p_club_id, uid) on conflict do nothing;
    if found then update clubs set member_count = member_count + 1 where id = p_club_id; end if;
  else
    delete from club_members where club_id = p_club_id and user_id = uid;
    if found then update clubs set member_count = member_count - 1 where id = p_club_id; end if;
  end if;
end $$;

create or replace function rsvp_event(p_event_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from event_rsvps where event_id = p_event_id and user_id = uid;
  if found then
    update events set rsvp_count = rsvp_count - 1 where id = p_event_id;
    return false;
  end if;
  if not exists (select 1 from events where id = p_event_id and status = 'approved') then raise exception 'NOT_FOUND'; end if;
  insert into event_rsvps (event_id, user_id) values (p_event_id, uid);
  update events set rsvp_count = rsvp_count + 1 where id = p_event_id;
  return true;
end $$;

create or replace function create_event(p_title text, p_description text, p_place text, p_starts_at timestamptz) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  club uuid;
  eid uuid;
begin
  select club_lead_of into club from profiles where id = auth.uid() and role in ('club_lead', 'admin');
  if club is null then raise exception 'FORBIDDEN'; end if;
  insert into events (club_id, title, description, place, starts_at, created_by)
  values (club, trim(p_title), coalesce(p_description, ''), coalesce(p_place, ''), p_starts_at, auth.uid()) returning id into eid;
  return eid;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function _price_cart(uuid, jsonb, uuid), _ahead_seconds(timestamptz, uuid) from authenticated;
grant execute on function public_allowed_domains() to anon;
