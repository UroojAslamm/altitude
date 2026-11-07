-- Students can clear finished orders from their own history.
-- The row stays, so analytics, meters, and the barista's records are unchanged.
alter table orders add column if not exists hidden_at timestamptz;

create or replace function hide_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.user_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if o.status not in ('completed', 'cancelled') then raise exception 'ILLEGAL_TRANSITION'; end if;
  update orders set hidden_at = now() where id = p_order_id;
end $$;

revoke execute on function hide_order(uuid) from public, anon;
grant execute on function hide_order(uuid) to authenticated;
