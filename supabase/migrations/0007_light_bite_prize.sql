-- The real Altitude menu has no croissant. The bakery prize now reads as a free light bite.
-- The voucher kind stays free_croissant, so existing rows and price_cart keep working.
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
  elsif roll < 90 then prize := 'free_croissant'; prize_label := 'Free light bite';
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
