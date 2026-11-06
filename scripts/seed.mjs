// Seeds demo data over HTTPS with the service role key. Safe to re-run.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const { VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, DEMO_PASSWORD: password } = process.env;
if (!url || !key || !password) throw new Error('Need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD');

const db = createClient(url, key, { auth: { persistSession: false } });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};
const aed = (n) => Math.round(n * 100);

// Accounts.
const ACCOUNTS = [
  { email: 'student1@altitude.demo', name: 'Aisha Demo', role: 'student', meters: 40 },
  { email: 'student2@altitude.demo', name: 'Omar Demo', role: 'student', meters: 420 },
  { email: 'student3@altitude.demo', name: 'Lina Demo', role: 'student', meters: 950 },
  { email: 'student4@altitude.demo', name: 'Zayn Demo', role: 'student', meters: 1720 },
  { email: 'barista@altitude.demo', name: 'Altitude Barista', role: 'barista', meters: 0 },
  { email: 'admin@altitude.demo', name: 'Altitude Manager', role: 'admin', meters: 0 },
  { email: 'clublead@altitude.demo', name: 'Club Lead Demo', role: 'club_lead', meters: 120 },
  { email: 'history@altitude.demo', name: 'Seed History', role: 'student', meters: 0 },
];

async function ensureUsers() {
  const existing = must(await db.auth.admin.listUsers({ perPage: 1000 }), 'listUsers').users;
  const ids = {};
  // Removes accounts left by e2e runs.
  for (const u of existing) {
    if (u.email?.endsWith('@altitude.demo') && !ACCOUNTS.some((a) => a.email === u.email)) {
      must(await db.auth.admin.deleteUser(u.id), 'deleteUser');
    }
  }
  for (const a of ACCOUNTS) {
    const found = existing.find((u) => u.email === a.email);
    if (found) {
      must(await db.auth.admin.updateUserById(found.id, { password }), 'updateUser');
      ids[a.email] = found.id;
    } else {
      const made = must(
        await db.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: { full_name: a.name } }),
        'createUser',
      );
      ids[a.email] = made.user.id;
    }
    must(await db.from('profiles').update({ full_name: a.name, role: a.role, total_meters: a.meters, squad_id: null }).eq('id', ids[a.email]), 'profile');
  }
  return ids;
}

// Menu. Smoothies and milkshakes transcribed from the counter poster. Prices are placeholders.
const CATEGORIES = ['Coffee', 'Iced & Cold', 'Smoothies', 'Milkshakes', 'Bakery'];
const ITEMS = [
  ['Coffee', 'Espresso', 'A short, intense double shot.', 10, 'hot', '#5A3A22', ['low-sugar', 'dairy-free', 'vegan'], 3, 60],
  ['Coffee', 'Americano', 'Espresso lengthened with hot water.', 12, 'hot', '#6B4426', ['low-sugar', 'dairy-free', 'vegan'], 3, 60],
  ['Coffee', 'Flat White', 'Double ristretto with silky microfoam.', 16, 'hot', '#B08A5E', [], 2, 90],
  ['Coffee', 'Latte', 'Espresso with steamed milk.', 16, 'hot', '#C7A27A', [], 2, 90],
  ['Coffee', 'Cappuccino', 'Espresso, steamed milk, deep foam.', 16, 'hot', '#BC9468', [], 2, 90],
  ['Coffee', 'Caramel Cloud Latte', 'Espresso, caramel, and a cloud of cold foam.', 21, 'hot', '#D29A4E', ['sweet'], 2, 120],
  ['Iced & Cold', 'Iced Latte', 'Espresso over ice with cold milk.', 18, 'iced', '#A9794B', [], 2, 75],
  ['Iced & Cold', 'Cold Brew', 'Slow-steeped, smooth, and strong.', 18, 'iced', '#3E2615', ['low-sugar', 'dairy-free', 'vegan'], 3, 45],
  ['Smoothies', 'Pash N Shoot', 'Passionfruit, Mango, Pineapple', 24, 'smoothie', '#F4C430', ['dairy-free', 'vegan', 'caffeine-free'], 0, 120],
  ['Smoothies', 'Strawberry Split', 'Strawberry, Banana', 24, 'smoothie', '#E8768A', ['dairy-free', 'vegan', 'caffeine-free', 'banana'], 0, 120],
  ['Smoothies', 'Tropical Colada', 'Coconut, Pineapple, Banana', 24, 'smoothie', '#F2E6B8', ['dairy-free', 'vegan', 'caffeine-free', 'banana'], 0, 120],
  ['Smoothies', 'Avo Go Go', 'Mango, Spinach, Broccoli, Avocado, Coconut, Lime, Ginger', 26, 'smoothie', '#5E9B45', ['dairy-free', 'vegan', 'caffeine-free', 'low-sugar', 'protein'], 0, 150, true],
  ['Smoothies', 'Big 5', 'Strawberry, Mango, Kiwi, Pineapple, Apple', 26, 'smoothie', '#EE9A8A', ['dairy-free', 'vegan', 'caffeine-free'], 0, 150, true],
  ['Smoothies', 'Berry Go Round', 'Raspberry, Blackberry, Strawberry', 25, 'smoothie', '#C8263C', ['dairy-free', 'vegan', 'caffeine-free'], 0, 120, true],
  ['Milkshakes', 'Chocolate Milkshake', 'Real milkshake made with Belgian chocolate.', 22, 'shake', '#6A4330', ['sweet', 'caffeine-free'], 0, 120, true],
  ['Milkshakes', 'Strawberry Milkshake', 'Real milkshake made with real strawberries.', 22, 'shake', '#C4687E', ['sweet', 'caffeine-free'], 0, 120, true],
  ['Milkshakes', 'Vanilla Milkshake', 'Real milkshake with vanilla.', 22, 'shake', '#D9BE8C', ['sweet', 'caffeine-free'], 0, 120, true],
  ['Bakery', 'Butter Croissant', 'Flaky, buttery, baked fresh.', 12, 'bakery', '#D9A441', ['caffeine-free'], 0, 30],
  ['Bakery', 'Tiramisu', 'This week\'s special. Coffee-soaked layers with mascarpone.', 19, 'bakery', '#8A5A3A', ['sweet'], 1, 30],
];
const GROUPS = [
  ['Size', 'single', true, [['Small', 0], ['Medium', 300], ['Large', 600]]],
  ['Milk', 'single', false, [['Whole', 0], ['Skim', 0], ['Oat', 300, ['dairy-free']], ['Almond', 300, ['dairy-free']]]],
  ['Extra shot', 'multi', false, [['Extra shot', 400, [], true]]],
  ['Syrup', 'multi', false, [['Caramel', 200, ['sweet']], ['Vanilla', 200, ['sweet']], ['Hazelnut', 200, ['sweet']]]],
  ['Sugar', 'single', false, [['Regular', 0], ['Low', 0], ['None', 0]]],
  ['Temperature', 'single', false, [['Normal', 0], ['Extra hot', 0], ['Iced', 0]]],
];
const GROUPS_FOR = {
  hot: ['Size', 'Milk', 'Extra shot', 'Syrup', 'Sugar', 'Temperature'],
  iced: ['Size', 'Milk', 'Extra shot', 'Syrup', 'Sugar'],
  smoothie: ['Size', 'Sugar'],
  shake: ['Size'],
  bakery: [],
};
const NO_MILK = new Set(['Espresso', 'Americano', 'Cold Brew']);

async function seedMenu() {
  must(await db.from('menu_categories').upsert(CATEGORIES.map((name, sort) => ({ name, sort })), { onConflict: 'name' }), 'categories');
  const cats = Object.fromEntries(must(await db.from('menu_categories').select('id,name'), 'cats').map((c) => [c.name, c.id]));

  const rows = ITEMS.map(([cat, name, description, price, kind, accent_color, tags, caffeine_level, prep_seconds, needs_review = false], sort) => ({
    category_id: cats[cat], name, description, base_price_fils: aed(price), kind, accent_color, tags, caffeine_level, prep_seconds,
    needs_review, sort, is_available: true, is_active: true, is_placeholder_price: true,
  }));
  must(await db.from('menu_items').upsert(rows, { onConflict: 'name' }), 'items');
  const items = must(await db.from('menu_items').select('*'), 'items read');

  must(await db.from('option_groups').upsert(GROUPS.map(([name, kind, required], sort) => ({ name, kind, required, sort })), { onConflict: 'name' }), 'groups');
  const groups = Object.fromEntries(must(await db.from('option_groups').select('id,name'), 'groups read').map((g) => [g.name, g.id]));
  const optionRows = GROUPS.flatMap(([gname, , , opts]) =>
    opts.map(([name, delta, tags = [], shot = false], sort) => ({
      group_id: groups[gname], name, price_delta_fils: delta, tags, is_extra_shot: shot, sort,
    })));
  must(await db.from('options').upsert(optionRows, { onConflict: 'group_id,name' }), 'options');

  const links = items.flatMap((it) =>
    (GROUPS_FOR[it.kind] ?? [])
      .filter((g) => !(g === 'Milk' && NO_MILK.has(it.name)))
      .map((g) => ({ item_id: it.id, group_id: groups[g] })));
  must(await db.from('item_option_groups').upsert(links, { onConflict: 'item_id,group_id' }), 'links');

  const dotm = items.find((i) => i.name === 'Caramel Cloud Latte');
  must(await db.from('drink_of_month').delete().neq('headline', '__none__'), 'dotm clear');
  must(await db.from('drink_of_month').insert({
    menu_item_id: dotm.id, headline: 'Soft caramel, cold foam, a proper shot underneath.', month: new Date().toISOString().slice(0, 7) + '-01',
  }), 'dotm');
  return items;
}

// Historic orders.
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (list) => list[rnd(0, list.length - 1)];
function weightedHour() {
  const w = [[8, 6], [9, 16], [10, 14], [11, 8], [12, 16], [13, 13], [14, 7], [15, 7], [16, 6], [17, 4], [7, 3]];
  let r = Math.random() * w.reduce((s, [, x]) => s + x, 0);
  for (const [h, x] of w) if ((r -= x) <= 0) return h;
  return 12;
}
function dubaiDate(daysAgo) {
  return new Date(Date.now() + 4 * 3600e3 - daysAgo * 86400e3).toISOString().slice(0, 10);
}

async function seedOrders(items, ids) {
  must(await db.from('orders').delete().eq('is_seed', true), 'clear seed orders');
  must(await db.from('orders').delete().eq('is_seed', false), 'clear orders');
  must(await db.from('order_counters').delete().gte('last_no', 0), 'clear counters');
  must(await db.from('meter_ledger').delete().gte('delta', -100000), 'clear ledger');

  const byName = Object.fromEntries(items.map((i) => [i.name, i]));
  const weights = [['Caramel Cloud Latte', 16], ['Iced Latte', 18], ['Cold Brew', 15], ['Latte', 12], ['Flat White', 8], ['Cappuccino', 7],
    ['Americano', 7], ['Espresso', 4], ['Pash N Shoot', 5], ['Strawberry Split', 4], ['Tropical Colada', 3], ['Avo Go Go', 3], ['Big 5', 3],
    ['Berry Go Round', 3], ['Chocolate Milkshake', 4], ['Strawberry Milkshake', 2], ['Vanilla Milkshake', 2]];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const drink = () => {
    let r = Math.random() * total;
    for (const [n, w] of weights) if ((r -= w) <= 0) return byName[n];
    return byName.Latte;
  };

  const days = [];
  for (let d = 28; d >= 1; d--) {
    const date = dubaiDate(d);
    const dow = new Date(date + 'T00:00:00Z').getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(date);
  }
  const perDay = Math.ceil(2000 / days.length);
  const orders = [];
  const lines = [];
  const counters = [];
  for (const date of days) {
    const count = perDay + rnd(-12, 12);
    const stamps = Array.from({ length: count }, () => {
      const h = String(weightedHour()).padStart(2, '0');
      const m = String(rnd(0, 59)).padStart(2, '0');
      const s = String(rnd(0, 59)).padStart(2, '0');
      return new Date(`${date}T${h}:${m}:${s}+04:00`);
    }).sort((a, b) => a - b);
    stamps.forEach((placed, i) => {
      const id = crypto.randomUUID();
      const d = drink();
      const basket = [d];
      if (d.name === 'Caramel Cloud Latte' ? Math.random() < 0.85 : Math.random() < 0.22) basket.push(byName['Butter Croissant']);
      else if (Math.random() < 0.08) basket.push(byName.Tiramisu);
      const subtotal = basket.reduce((s, it) => s + it.base_price_fils, 0);
      const peak = [9, 10, 12, 13].includes((placed.getUTCHours() + 4) % 24);
      const prepStart = new Date(placed.getTime() + rnd(20, peak ? 240 : 90) * 1000);
      const ready = new Date(prepStart.getTime() + rnd(60, 200) * 1000);
      orders.push({
        id, order_no: i + 1, order_date: date, user_id: ids['history@altitude.demo'], customer_name: 'Guest', status: 'completed',
        dine_in: Math.random() < 0.5, payment_method: 'demo_card', payment_status: 'paid', subtotal_fils: subtotal, total_fils: subtotal,
        placed_at: placed.toISOString(), preparing_at: prepStart.toISOString(), ready_at: ready.toISOString(),
        completed_at: new Date(ready.getTime() + rnd(30, 200) * 1000).toISOString(), meters_awarded: Math.floor(subtotal / 100), is_seed: true,
      });
      for (const it of basket) {
        lines.push({ order_id: id, menu_item_id: it.id, name_snapshot: it.name, unit_price_fils: it.base_price_fils, qty: 1 });
      }
    });
    counters.push({ order_date: date, last_no: count });
  }

  // Student 1 gets a short history so the usual, reorder, and a spin ticket are ready to show.
  const history = dubaiDate(14);
  const start = counters.find((c) => c.order_date <= history) ?? counters[0];
  for (let i = 0; i < 6; i++) {
    const id = crypto.randomUUID();
    const it = i % 2 ? byName['Cold Brew'] : byName['Iced Latte'];
    start.last_no += 1;
    const placed = new Date(`${start.order_date}T11:0${i}:00+04:00`);
    orders.push({
      id, order_no: start.last_no, order_date: start.order_date, user_id: ids['student1@altitude.demo'], customer_name: 'Aisha', status: 'completed', dine_in: false,
      payment_method: 'demo_card', payment_status: 'paid', subtotal_fils: it.base_price_fils, total_fils: it.base_price_fils,
      placed_at: placed.toISOString(), preparing_at: placed.toISOString(), ready_at: new Date(placed.getTime() + 120e3).toISOString(),
      completed_at: new Date(placed.getTime() + 180e3).toISOString(), meters_awarded: 0, is_seed: true,
    });
    lines.push({ order_id: id, menu_item_id: it.id, name_snapshot: it.name, unit_price_fils: it.base_price_fils, qty: 1 });
  }

  for (let i = 0; i < orders.length; i += 500) must(await db.from('orders').insert(orders.slice(i, i + 500)), 'orders');
  for (let i = 0; i < lines.length; i += 500) must(await db.from('order_items').insert(lines.slice(i, i + 500)), 'lines');
  must(await db.from('order_counters').insert(counters), 'counters');
  return orders.length;
}

async function seedCommunity(items, ids) {
  const byName = Object.fromEntries(items.map((i) => [i.name, i]));
  const s = (n) => ids[`student${n}@altitude.demo`];

  // Squad.
  must(await db.from('squads').delete().gte('created_at', '2000-01-01'), 'squad clear');
  const squad = must(await db.from('squads').insert({ name: 'Espresso Sherpas', code: 'CLIMB1', created_by: s(2), squad_meters: 620 }).select().single(), 'squad');
  must(await db.from('squad_members').insert([{ squad_id: squad.id, user_id: s(2) }, { squad_id: squad.id, user_id: s(3) }]), 'squad members');
  must(await db.from('profiles').update({ squad_id: squad.id }).in('id', [s(2), s(3)]), 'squad profiles');

  // Clubs.
  must(await db.from('club_members').delete().gte('created_at', '2000-01-01'), 'club clear');
  const clubRows = [['AIRC', 'AI and robotics club at RIT Dubai.'], ['ASHRAE RIT Dubai', 'Building systems and sustainability.'], ['IEEE', 'Engineering talks and projects.'], ['Robotics', 'Build it, code it, race it.'], ['Debate', 'Argue well, think better.']];
  must(await db.from('clubs').upsert(clubRows.map(([name, description]) => ({ name, description, member_count: 0 })), { onConflict: 'name' }), 'clubs');
  const clubs = Object.fromEntries(must(await db.from('clubs').select('id,name'), 'clubs read').map((c) => [c.name, c.id]));
  const memberships = [[s(1), 'AIRC'], [s(2), 'AIRC'], [s(3), 'IEEE'], [s(4), 'Robotics'], [ids['clublead@altitude.demo'], 'AIRC'], [s(3), 'Debate']];
  must(await db.from('club_members').insert(memberships.map(([user_id, c]) => ({ user_id, club_id: clubs[c] }))), 'club members');
  for (const [name, id] of Object.entries(clubs)) {
    must(await db.from('clubs').update({ member_count: memberships.filter(([, c]) => c === name).length }).eq('id', id), 'club count');
  }
  must(await db.from('profiles').update({ club_lead_of: clubs.AIRC }).eq('id', ids['clublead@altitude.demo']), 'lead');
  const ledger = ACCOUNTS.filter((a) => a.meters > 0).map((a) => ({ user_id: ids[a.email], delta: a.meters, reason: 'adjustment' }));
  must(await db.from('meter_ledger').insert(ledger), 'ledger');

  // Events.
  must(await db.from('events').delete().gte('created_at', '2000-01-01'), 'events clear');
  const inDays = (n, h) => new Date(`${dubaiDate(-n)}T${String(h).padStart(2, '0')}:00:00+04:00`).toISOString();
  must(await db.from('events').insert([
    { club_id: clubs.AIRC, title: 'Prompt Night', description: 'Bring a laptop and a hard problem.', place: 'Altitude lounge', starts_at: inDays(3, 16), status: 'approved', rsvp_count: 14 },
    { club_id: clubs.IEEE, title: 'Circuit Clinic', description: 'Peer help for lab reports.', place: 'Lab block', starts_at: inDays(5, 13), status: 'approved', rsvp_count: 9 },
    { club_id: clubs.Debate, title: 'Open Floor Debate', description: 'Topic announced on the day.', place: 'Main hall', starts_at: inDays(8, 15), status: 'approved', rsvp_count: 21 },
    { club_id: clubs.Robotics, title: 'Line Follower Sprint', description: 'Waiting for approval.', place: 'Workshop', starts_at: inDays(10, 14), status: 'pending', rsvp_count: 0 },
  ]), 'events');

  // Reviews.
  must(await db.from('reviews').delete().eq('is_seed', true), 'reviews clear');
  const reviewRows = [
    [1, 'Iced Latte', 5, 'Exactly what a 9 AM lab needs.', 'Aisha'], [2, 'Cold Brew', 4, 'Strong and smooth.', 'Omar'],
    [3, 'Caramel Cloud Latte', 5, 'The foam is the whole point.', 'Lina'], [4, 'Pash N Shoot', 5, 'Tastes like real fruit.', 'Zayn'],
    [2, 'Butter Croissant', 4, 'Flaky and warm.', 'Omar'], [3, 'Iced Latte', 4, 'Reliable every time.', 'Lina'],
  ];
  must(await db.from('reviews').insert(reviewRows.map(([n, item, rating, body, author_name]) => ({
    user_id: s(n), menu_item_id: byName[item].id, rating, body, author_name, is_seed: true,
  }))), 'reviews');

  // Drink Lab.
  must(await db.from('drink_submissions').delete().eq('is_seed', true), 'lab clear');
  const month = dubaiDate(0).slice(0, 7) + '-01';
  must(await db.from('drink_submissions').insert([
    { user_id: s(2), author_name: 'Omar', name: 'Finals Fuel', description: 'Cold brew with a hit of vanilla and sea salt foam.', base_item_id: byName['Cold Brew'].id, ingredients: 'Cold brew, vanilla, salted foam', month, vote_count: 18, is_seed: true },
    { user_id: s(3), author_name: 'Lina', name: 'Saffron Sunrise', description: 'Iced latte with saffron and cardamom.', base_item_id: byName['Iced Latte'].id, ingredients: 'Espresso, milk, saffron, cardamom', month, vote_count: 24, is_seed: true },
    { user_id: s(4), author_name: 'Zayn', name: 'Mango Peak', description: 'Pash N Shoot with a ginger kick.', base_item_id: byName['Pash N Shoot'].id, ingredients: 'Mango, passionfruit, ginger', month, vote_count: 11, is_seed: true },
    { user_id: ids['clublead@altitude.demo'], author_name: 'Club', name: 'Date Night', description: 'Latte with date syrup.', base_item_id: byName.Latte.id, ingredients: 'Espresso, milk, date syrup', month, vote_count: 15, is_seed: true },
    { user_id: s(1), author_name: 'Aisha', name: 'Rose Cloud', description: 'Cold foam with rose water over espresso.', base_item_id: byName.Latte.id, ingredients: 'Espresso, cold foam, rose water', month, vote_count: 9, is_seed: true },
  ]), 'lab');

  // Announcement and promo.
  must(await db.from('announcements').delete().gte('created_at', '2000-01-01'), 'ann clear');
  must(await db.from('promos').delete().gte('created_at', '2000-01-01'), 'promo clear');
  const week = new Date(Date.now() + 7 * 86400e3).toISOString();
  must(await db.from('announcements').insert({ title: 'Exam week fuel', body: 'Double up during Common Hour, 2 to 4 PM.', kind: 'exam_week', ends_at: week }), 'announcement');
  must(await db.from('promos').insert({ title: 'Tiramisu Week', description: '15% off this week\'s special.', kind: 'percent', value: 15, applies_to_item_id: byName.Tiramisu.id, ends_at: week }), 'promo');
}

const ids = await ensureUsers();
const items = await seedMenu();
const orderCount = await seedOrders(items, ids);
await seedCommunity(items, ids);
console.log(`seeded ${items.length} items, ${orderCount} orders`);
