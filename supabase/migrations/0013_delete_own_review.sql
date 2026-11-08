-- A student can delete only their own review of an item.
create or replace function delete_review(p_item_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from reviews where user_id = auth.uid() and menu_item_id = p_item_id;
end $$;

revoke execute on function delete_review(uuid) from public, anon;
grant execute on function delete_review(uuid) to authenticated;
