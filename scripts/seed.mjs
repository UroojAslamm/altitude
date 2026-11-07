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
  { email: 'barista@altitude.demo', name: 'Sara Demo', role: 'barista', meters: 0 },
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

// Menu. Names, descriptions, and prices come from the cafe's own menu at scanned.page/p/Vop03v.
const CATEGORIES = ['Espresso Brew', 'Manual Brew', 'Coffee-Free Drinks', 'Tea', 'Light Bites'];
const BLACK = ['low-sugar', 'dairy-free', 'vegan'];
const FRUIT = ['dairy-free', 'vegan', 'caffeine-free'];
const MILK_NOTE = 'Choose Specialty Beans or Decaf. Alternative milk available at a charge.';
const ESPRESSO_NOTE = 'Single or double shot with your choice of Specialty Bean. Available in Decaf.';
const BLACK_NOTE = 'Your choice of Specialty Bean. Available in Decaf.';
const FLAVOURED = (name, accent) => ['Espresso Brew', name, MILK_NOTE, 20, 'iced', accent, ['sweet'], 2, 90];
const ITEMS = [
  ['Espresso Brew', 'Espresso 20g', ESPRESSO_NOTE, 14, 'hot', '#5A3A22', BLACK, 3, 60],
  ['Espresso Brew', 'Espresso 32g', ESPRESSO_NOTE, 16, 'hot', '#4C2F1B', BLACK, 3, 60],
  ['Espresso Brew', 'Americano', BLACK_NOTE, 17, 'hot', '#6B4426', BLACK, 3, 60],
  ['Espresso Brew', 'Iced Americano', BLACK_NOTE, 17, 'iced', '#3E2615', BLACK, 3, 60],
  ['Espresso Brew', 'Cappuccino', MILK_NOTE, 18, 'hot', '#BC9468', [], 2, 90],
  ['Espresso Brew', 'Piccolo', MILK_NOTE, 17, 'hot', '#A87B4F', [], 2, 75],
  ['Espresso Brew', 'Cortado', MILK_NOTE, 18, 'hot', '#9A6F47', [], 2, 75],
  ['Espresso Brew', 'Flat White', MILK_NOTE, 18, 'hot', '#B08A5E', [], 2, 90],
  ['Espresso Brew', 'Cafe Latte', MILK_NOTE, 18, 'hot', '#C7A27A', [], 2, 90],
  ['Espresso Brew', 'Spanish Latte', MILK_NOTE, 18, 'hot', '#C9A06C', ['sweet'], 2, 90],
  ['Espresso Brew', 'Iced Spanish Latte', MILK_NOTE, 18, 'iced', '#B98D5A', ['sweet'], 2, 90],
  FLAVOURED('Iced Saffron Spanish Latte', '#D29A4E'),
  FLAVOURED('Iced Pistachio Spanish Latte', '#A8AE6B'),
  FLAVOURED('Iced Rose Spanish Latte', '#D39A9A'),
  FLAVOURED('Iced Dark Caramel Latte', '#8A5A2E'),
  FLAVOURED('Iced Nutella Latte', '#6A4330'),
  FLAVOURED('Iced Peanut Butter Latte', '#B5854E'),
  FLAVOURED('Iced Caramel Latte', '#C08A45'),
  FLAVOURED('Iced Strawberry Latte', '#D88A96'),
  ['Espresso Brew', 'Affogato', 'Single or double shot espresso poured over vanilla ice cream.', 20, 'hot', '#D9BE8C', ['sweet'], 2, 90],
  ['Manual Brew', 'Chemex', 'Brewed using a Chemex coffeemaker and special filter paper. Served hot or iced.', 18, 'hot', '#5C3A20', BLACK, 3, 240],
  ['Manual Brew', 'V60', 'Pour-over coffee from a cone-shaped dripper with a 60-degree angle. Served hot or iced.', 18, 'hot', '#6B4426', BLACK, 3, 210],
  ['Manual Brew', 'Aeropress', 'A smooth, full-bodied, rich coffee made with the AeroPress. Served hot or iced.', 18, 'hot', '#4C2F1B', BLACK, 3, 150],
  ['Coffee-Free Drinks', 'Hot Chocolate', 'Served hot or iced.', 16, 'hot', '#6A4330', ['sweet', 'caffeine-free'], 0, 90],
  ['Coffee-Free Drinks', 'Acai Smoothie', 'Acai with strawberry, banana, and your choice of liquid base.', 20, 'smoothie', '#5B2A5E', ['caffeine-free', 'banana'], 0, 150],
  ['Coffee-Free Drinks', 'Banana Chocolate Protein Shake', 'For those looking for their daily protein fix.', 18, 'shake', '#7A5236', ['protein', 'banana', 'caffeine-free'], 0, 120],
  ['Coffee-Free Drinks', 'Mango Mango', 'So nice, we named it twice. Refreshing iced mango drink.', 16, 'smoothie', '#F4B73A', FRUIT, 0, 90],
  ['Coffee-Free Drinks', 'Berry Go Round Smoothie', 'Strawberries, raspberries, and blackberries with fresh apple juice.', 17, 'smoothie', '#C8263C', FRUIT, 0, 120],
  ['Coffee-Free Drinks', "Pash n' Shoot Smoothie", 'Passion fruit, pineapple, and mango with fresh apple juice.', 17, 'smoothie', '#F4C430', FRUIT, 0, 120],
  ['Coffee-Free Drinks', 'Strawberry Split Smoothie', 'A creamy mix of strawberry and banana with fresh apple juice.', 17, 'smoothie', '#E8768A', [...FRUIT, 'banana'], 0, 120],
  ['Coffee-Free Drinks', 'Big 5 Smoothie', 'Pineapple, mango, strawberry, and kiwi with fresh apple juice.', 17, 'smoothie', '#EE9A8A', FRUIT, 0, 120],
  ['Coffee-Free Drinks', 'Milkshake', 'Strawberry, chocolate, or vanilla. Pick your favourite.', 17, 'shake', '#D9BE8C', ['sweet', 'caffeine-free'], 0, 120],
  ['Tea', 'Rooibos Tea', 'A herbal tea rich in antioxidants. Served hot or iced.', 15, 'hot', '#B5532A', [...FRUIT, 'low-sugar'], 0, 150],
  ['Tea', 'Green Tea', 'Teas from around the world.', 15, 'hot', '#8FA65A', [...BLACK], 1, 150],
  ['Tea', 'Black Tea', 'Teas from around the world.', 15, 'hot', '#7A3E1D', [...BLACK], 1, 150],
  ['Tea', 'Hibiscus Tea', 'An infusion of deep magenta roselle calyces.', 15, 'hot', '#A3123E', [...FRUIT, 'low-sugar'], 0, 150],
  ['Tea', 'Iced Hibiscus Tea', 'An infusion of deep magenta roselle calyces, over ice.', 15, 'iced', '#A3123E', [...FRUIT, 'low-sugar'], 0, 120],
  ['Tea', 'Matcha Latte', 'The matcha take on a latte.', 18, 'hot', '#8FB35A', [], 1, 120],
  ['Tea', 'Iced Matcha Latte', 'The matcha take on a latte, over ice.', 18, 'iced', '#8FB35A', [], 1, 120],
  ['Light Bites', 'Acai Bowl', 'Topped with strawberries and banana.', 20, 'bakery', '#5B2A5E', ['caffeine-free', 'banana'], 0, 180],
];
const NAMES = new Set(ITEMS.map(([, name]) => name));
// Sizes and syrups are not on the real menu. The milk and extra shot charges are still placeholders.
const GROUPS = [
  ['Shot', 'single', false, [['Double', 0], ['Single', 0]]],
  ['Beans', 'single', false, [['Specialty', 0], ['Decaf', 0]]],
  ['Milk', 'single', false, [['Whole', 0], ['Skim', 0], ['Oat', 300, ['dairy-free']], ['Almond', 300, ['dairy-free']]]],
  ['Extra shot', 'multi', false, [['Extra shot', 400, [], true]]],
  ['Sugar', 'single', false, [['Regular', 0], ['Low', 0], ['None', 0]]],
  ['Temperature', 'single', false, [['Normal', 0], ['Extra hot', 0], ['Iced', 0]]],
  ['Flavour', 'single', true, [['Strawberry', 0], ['Chocolate', 0], ['Vanilla', 0]]],
];
const BLACK_COFFEE = new Set(['Americano', 'Iced Americano', 'Chemex', 'V60', 'Aeropress']);
const SHOTS = new Set(['Espresso 20g', 'Espresso 32g', 'Affogato']);
const PLAIN_TEA = new Set(['Rooibos Tea', 'Green Tea', 'Black Tea', 'Hibiscus Tea']);
function groupsFor(item) {
  if (item.name === 'Milkshake') return ['Flavour'];
  if (item.name === 'Affogato') return ['Shot', 'Beans'];
  if (SHOTS.has(item.name)) return ['Shot', 'Beans', 'Sugar'];
  if (item.name === 'Iced Hibiscus Tea') return ['Sugar'];
  if (PLAIN_TEA.has(item.name)) return ['Sugar', 'Temperature'];
  if (item.name === 'Hot Chocolate') return ['Milk', 'Sugar', 'Temperature'];
  if (item.name === 'Matcha Latte') return ['Milk', 'Sugar', 'Temperature'];
  if (item.name === 'Iced Matcha Latte') return ['Milk', 'Sugar'];
  if (item.kind === 'smoothie' || item.kind === 'shake' || item.kind === 'bakery') return [];
  const temp = item.kind === 'hot' ? ['Temperature'] : [];
  if (BLACK_COFFEE.has(item.name)) return ['Beans', 'Extra shot', 'Sugar', ...temp];
  return ['Beans', 'Milk', 'Extra shot', 'Sugar', ...temp];
}

async function clearOrders() {
  must(await db.from('orders').delete().eq('is_seed', true), 'clear seed orders');
  must(await db.from('orders').delete().eq('is_seed', false), 'clear orders');
  must(await db.from('order_counters').delete().gte('last_no', 0), 'clear counters');
  must(await db.from('meter_ledger').delete().gte('delta', -100000), 'clear ledger');
}

async function seedMenu() {
  must(await db.from('menu_categories').upsert(CATEGORIES.map((name, sort) => ({ name, sort })), { onConflict: 'name' }), 'categories');
  const cats = Object.fromEntries(must(await db.from('menu_categories').select('id,name'), 'cats').map((c) => [c.name, c.id]));

  const rows = ITEMS.map(([cat, name, description, price, kind, accent_color, tags, caffeine_level, prep_seconds], sort) => ({
    category_id: cats[cat], name, description, base_price_fils: aed(price), kind, accent_color, tags, caffeine_level, prep_seconds,
    needs_review: false, sort, is_available: true, is_active: true, is_placeholder_price: false,
  }));
  must(await db.from('menu_items').upsert(rows, { onConflict: 'name' }), 'items');

  // Remove anything that is not on the real menu. Orders were cleared first, so nothing points at it.
  const stale = must(await db.from('menu_items').select('id,name'), 'items read').filter((i) => !NAMES.has(i.name));
  if (stale.length) must(await db.from('menu_items').delete().in('id', stale.map((i) => i.id)), 'stale items');
  must(await db.from('menu_categories').delete().not('name', 'in', `(${CATEGORIES.map((c) => `"${c}"`).join(',')})`), 'stale categories');
  const items = must(await db.from('menu_items').select('*'), 'items read');

  must(await db.from('option_groups').upsert(GROUPS.map(([name, kind, required], sort) => ({ name, kind, required, sort })), { onConflict: 'name' }), 'groups');
  const groups = Object.fromEntries(must(await db.from('option_groups').select('id,name'), 'groups read').map((g) => [g.name, g.id]));
  const optionRows = GROUPS.flatMap(([gname, , , opts]) =>
    opts.map(([name, delta, tags = [], shot = false], sort) => ({
      group_id: groups[gname], name, price_delta_fils: delta, tags, is_extra_shot: shot, sort,
    })));
  must(await db.from('options').upsert(optionRows, { onConflict: 'group_id,name' }), 'options');

  must(await db.from('item_option_groups').delete().in('item_id', items.map((i) => i.id)), 'links clear');
  const links = items.flatMap((it) => groupsFor(it).map((g) => ({ item_id: it.id, group_id: groups[g] })));
  must(await db.from('item_option_groups').upsert(links, { onConflict: 'item_id,group_id' }), 'links');

  const dotm = items.find((i) => i.name === 'Iced Saffron Spanish Latte');
  must(await db.from('drink_of_month').delete().neq('headline', '__none__'), 'dotm clear');
  must(await db.from('drink_of_month').insert({
    menu_item_id: dotm.id, headline: 'Spanish latte over ice with a saffron note.', month: new Date().toISOString().slice(0, 7) + '-01',
  }), 'dotm');

  // Hours and links from the same page. Friday closes at 16:00 there; settings hold one close time.
  must(await db.from('settings').update({
    open_time: '08:00', close_time: '19:00', days_open: [1, 2, 3, 4, 5],
    common_hour_start: '12:00', common_hour_end: '13:00',
    social_links: {
      instagram: 'https://www.instagram.com/altitude_dxb/',
      facebook: 'https://www.facebook.com/profile.php?id=100075548482716',
      google: 'https://g.page/r/CTgXFdPlmZf7EAE/review',
    },
  }).eq('id', true), 'settings');
  return items;
}

// Historic orders.
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (list) => list[rnd(0, list.length - 1)];
function weightedHour() {
  const w = [[8, 6], [9, 16], [10, 14], [11, 8], [12, 16], [13, 13], [14, 7], [15, 7], [16, 6], [17, 4], [18, 3]];
  let r = Math.random() * w.reduce((s, [, x]) => s + x, 0);
  for (const [h, x] of w) if ((r -= x) <= 0) return h;
  return 12;
}
function dubaiDate(daysAgo) {
  return new Date(Date.now() + 4 * 3600e3 - daysAgo * 86400e3).toISOString().slice(0, 10);
}

async function seedOrders(items, ids) {
  const byName = Object.fromEntries(items.map((i) => [i.name, i]));
  const weights = [['Iced Saffron Spanish Latte', 16], ['Iced Spanish Latte', 18], ['Spanish Latte', 12], ['Cafe Latte', 12], ['Flat White', 9], ['Cappuccino', 8],
    ['V60', 7], ['Americano', 7], ['Iced Americano', 6], ['Espresso 20g', 4], ['Matcha Latte', 6], ['Iced Hibiscus Tea', 3], ["Pash n' Shoot Smoothie", 5],
    ['Strawberry Split Smoothie', 4], ['Big 5 Smoothie', 3], ['Berry Go Round Smoothie', 3], ['Mango Mango', 4], ['Milkshake', 4], ['Banana Chocolate Protein Shake', 3]];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const drink = () => {
    let r = Math.random() * total;
    for (const [n, w] of weights) if ((r -= w) <= 0) return byName[n];
    return byName['Cafe Latte'];
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
      if (d.name === 'Iced Saffron Spanish Latte' ? Math.random() < 0.6 : Math.random() < 0.2) basket.push(byName['Acai Bowl']);
      else if (Math.random() < 0.08) basket.push(byName.Affogato);
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
    const it = i % 2 ? byName.V60 : byName['Iced Spanish Latte'];
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

  const ledger = ACCOUNTS.filter((a) => a.meters > 0).map((a) => ({ user_id: ids[a.email], delta: a.meters, reason: 'adjustment' }));
  must(await db.from('meter_ledger').insert(ledger), 'ledger');

  // Events and Drink Lab are gone from the app. Clear any old rows.
  must(await db.from('events').delete().gte('created_at', '2000-01-01'), 'events clear');

  // Reviews.
  must(await db.from('reviews').delete().eq('is_seed', true), 'reviews clear');
  const reviewRows = [
    [1, 'Iced Spanish Latte', 5, 'Exactly what a 9 AM lab needs.', 'Aisha'], [2, 'V60', 4, 'Clean and bright.', 'Omar'],
    [3, 'Iced Saffron Spanish Latte', 5, 'The saffron is the whole point.', 'Lina'], [4, "Pash n' Shoot Smoothie", 5, 'Tastes like real fruit.', 'Zayn'],
    [2, 'Acai Bowl', 4, 'Filling between classes.', 'Omar'], [3, 'Iced Spanish Latte', 4, 'Reliable every time.', 'Lina'],
  ];
  must(await db.from('reviews').insert(reviewRows.map(([n, item, rating, body, author_name]) => ({
    user_id: s(n), menu_item_id: byName[item].id, rating, body, author_name, is_seed: true,
  }))), 'reviews');

  must(await db.from('drink_submissions').delete().eq('is_seed', true), 'lab clear');

  // Announcement and promo.
  must(await db.from('announcements').delete().gte('created_at', '2000-01-01'), 'ann clear');
  must(await db.from('promos').delete().gte('created_at', '2000-01-01'), 'promo clear');
  const week = new Date(Date.now() + 7 * 86400e3).toISOString();
  must(await db.from('announcements').insert({ title: 'Exam week fuel', body: 'Double up during Common Hour, 12 to 1 PM.', kind: 'exam_week', ends_at: week }), 'announcement');
  must(await db.from('promos').insert({ title: 'Affogato Week', description: '15% off this week\'s special.', kind: 'percent', value: 15, applies_to_item_id: byName.Affogato.id, ends_at: week }), 'promo');
}

const ids = await ensureUsers();
await clearOrders();
const items = await seedMenu();
const orderCount = await seedOrders(items, ids);
await seedCommunity(items, ids);
console.log(`seeded ${items.length} items, ${orderCount} orders`);
