-- ASCEND schema. Money is integer fils. Time is timestamptz; business dates use Asia/Dubai.

create type user_role as enum ('student', 'club_lead', 'barista', 'admin');
create type order_status as enum ('placed', 'preparing', 'ready', 'completed', 'cancelled');
create type event_status as enum ('pending', 'approved', 'rejected');

create table settings (
  id boolean primary key default true check (id),
  accepting_orders boolean not null default true,
  demo_always_open boolean not null default true,
  open_time time not null default '07:30',
  close_time time not null default '18:00',
  days_open int[] not null default '{1,2,3,4,5}',
  allowed_domains text[] not null default '{rit.edu,g.rit.edu,altitude.demo}',
  tier_thresholds jsonb not null default '{"ridge":300,"summit":800,"peak":1600}',
  squad_bonus_pct int not null default 10,
  squad_bonus_daily_cap int not null default 50,
  squad_levels jsonb not null default '{"l2":500,"l3":1500}',
  common_hour_start time not null default '14:00',
  common_hour_end time not null default '16:00',
  common_hour_multiplier int not null default 2,
  common_hour_days int[] not null default '{1,2,3,4,5}',
  seat_status text not null default 'plenty' check (seat_status in ('plenty', 'few', 'full')),
  social_links jsonb not null default '{}',
  barista_count int not null default 1 check (barista_count > 0),
  created_at timestamptz not null default now()
);
insert into settings default values;

create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 30),
  code text not null unique check (char_length(code) = 6),
  created_by uuid not null,
  squad_meters int not null default 0,
  created_at timestamptz not null default now()
);

create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  member_count int not null default 0,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 60),
  email text not null,
  role user_role not null default 'student',
  birth_month int check (birth_month between 1 and 12),
  birth_day int check (birth_day between 1 and 31),
  total_meters int not null default 0,
  squad_id uuid references squads (id) on delete set null,
  club_lead_of uuid references clubs (id) on delete set null,
  created_at timestamptz not null default now()
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories (id),
  name text not null unique,
  description text not null default '',
  base_price_fils int not null check (base_price_fils >= 0),
  image_url text,
  accent_color text not null default '#C99A5B',
  kind text not null check (kind in ('hot', 'iced', 'smoothie', 'shake', 'bakery')),
  tags text[] not null default '{}',
  caffeine_level int not null default 0 check (caffeine_level between 0 and 3),
  prep_seconds int not null default 90 check (prep_seconds > 0),
  is_available boolean not null default true,
  is_active boolean not null default true,
  needs_review boolean not null default false,
  is_placeholder_price boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table option_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('single', 'multi')),
  required boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references option_groups (id) on delete cascade,
  name text not null,
  price_delta_fils int not null default 0,
  tags text[] not null default '{}',
  is_extra_shot boolean not null default false,
  is_available boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

create table item_option_groups (
  item_id uuid not null references menu_items (id) on delete cascade,
  group_id uuid not null references option_groups (id) on delete cascade,
  primary key (item_id, group_id)
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('percent', 'free_shot', 'free_croissant', 'free_drink', 'mystery')),
  value int not null default 0,
  label text not null,
  source text not null,
  expires_at timestamptz not null,
  used_order_id uuid,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no int not null,
  order_date date not null,
  user_id uuid not null references profiles (id) on delete cascade,
  customer_name text not null default '',
  status order_status not null default 'placed',
  dine_in boolean not null default false,
  payment_method text not null check (payment_method in ('demo_card', 'pickup')),
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'unpaid')),
  subtotal_fils int not null,
  free_shot_fils int not null default 0,
  discount_fils int not null default 0,
  discount_label text,
  tip_fils int not null default 0 check (tip_fils between 0 and 10000),
  total_fils int not null,
  notes text check (char_length(notes) <= 140),
  voucher_id uuid references vouchers (id),
  client_request_id uuid unique,
  estimated_ready_at timestamptz,
  placed_at timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  meters_awarded int,
  meter_breakdown jsonb,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_date, order_no)
);
create index orders_user_idx on orders (user_id, placed_at desc);
create index orders_open_idx on orders (status, placed_at) where status in ('placed', 'preparing', 'ready');
create index orders_placed_idx on orders (placed_at);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  menu_item_id uuid not null references menu_items (id),
  name_snapshot text not null,
  unit_price_fils int not null,
  qty int not null check (qty between 1 and 20),
  options_snapshot jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index order_items_order_idx on order_items (order_id);
create index order_items_item_idx on order_items (menu_item_id);

create table order_counters (
  order_date date primary key,
  last_no int not null default 0
);

create table meter_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  order_id uuid references orders (id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('order', 'squad_bonus', 'spin', 'adjustment')),
  created_at timestamptz not null default now(),
  unique (order_id, user_id, reason)
);
create index meter_ledger_user_idx on meter_ledger (user_id, created_at desc);

create table squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads (id) on delete cascade,
  user_id uuid not null unique references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table squad_bonus_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  meters int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  options_snapshot jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, menu_item_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  author_name text not null default '',
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 280),
  is_hidden boolean not null default false,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, menu_item_id)
);

create table promos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  kind text not null check (kind in ('percent', 'amount', 'banner')),
  value int not null default 0,
  applies_to_item_id uuid references menu_items (id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('info', 'exam_week')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table drink_of_month (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  headline text not null default '',
  special_price_fils int,
  month date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index drink_of_month_one_active on drink_of_month (is_active) where is_active;

create table spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  prize_kind text not null,
  created_at timestamptz not null default now()
);

create table club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs (id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  description text not null default '' check (char_length(description) <= 400),
  place text not null default '',
  starts_at timestamptz not null,
  status event_status not null default 'pending',
  created_by uuid references profiles (id) on delete set null,
  rsvp_count int not null default 0,
  created_at timestamptz not null default now()
);

create table event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table drink_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  author_name text not null default '',
  name text not null check (char_length(name) <= 40),
  description text not null default '' check (char_length(description) <= 200),
  base_item_id uuid references menu_items (id) on delete set null,
  ingredients text not null default '',
  month date not null,
  vote_count int not null default 0,
  is_hidden boolean not null default false,
  promoted_item_id uuid references menu_items (id) on delete set null,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table drink_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references drink_submissions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);
