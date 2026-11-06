export interface Category { id: string; name: string; sort: number }

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  base_price_fils: number;
  image_url: string | null;
  accent_color: string;
  kind: 'hot' | 'iced' | 'smoothie' | 'shake' | 'bakery';
  tags: string[];
  caffeine_level: number;
  prep_seconds: number;
  is_available: boolean;
  is_active: boolean;
  needs_review: boolean;
  is_placeholder_price: boolean;
  sort: number;
}

export interface Option {
  id: string;
  group_id: string;
  name: string;
  price_delta_fils: number;
  tags: string[];
  is_extra_shot: boolean;
  is_available: boolean;
  sort: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  kind: 'single' | 'multi';
  required: boolean;
  sort: number;
  options: Option[];
}

export interface Settings {
  accepting_orders: boolean;
  demo_always_open: boolean;
  open_time: string;
  close_time: string;
  days_open: number[];
  allowed_domains: string[];
  tier_thresholds: { ridge: number; summit: number; peak: number };
  squad_bonus_pct: number;
  squad_levels: { l2: number; l3: number };
  common_hour_start: string;
  common_hour_end: string;
  common_hour_multiplier: number;
  common_hour_days: number[];
  seat_status: 'plenty' | 'few' | 'full';
  social_links: Record<string, string>;
  barista_count: number;
}

export type OrderStatus = 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name_snapshot: string;
  unit_price_fils: number;
  qty: number;
  options_snapshot: Array<{ id: string; name: string; price_delta_fils: number }>;
}

export interface MeterBreakdown {
  base: number;
  multiplier: number;
  earned: number;
  squad_bonus_shared: number;
  total_meters: number;
  tier_before: string;
  tier_after: string;
  tier_changed: boolean;
}

export interface Order {
  id: string;
  order_no: number;
  order_date: string;
  user_id: string;
  customer_name: string;
  status: OrderStatus;
  dine_in: boolean;
  payment_method: 'demo_card' | 'pickup';
  payment_status: 'paid' | 'unpaid';
  subtotal_fils: number;
  free_shot_fils: number;
  discount_fils: number;
  discount_label: string | null;
  tip_fils: number;
  total_fils: number;
  notes: string | null;
  estimated_ready_at: string | null;
  placed_at: string;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  meters_awarded: number | null;
  meter_breakdown: MeterBreakdown | null;
  order_items?: OrderItem[];
}

export interface Voucher {
  id: string;
  kind: string;
  value: number;
  label: string;
  source: string;
  expires_at: string;
  used_order_id: string | null;
}

export interface PricePreview {
  subtotal_fils: number;
  free_shot_fils: number;
  discount_fils: number;
  discount_label: string | null;
  voucher_applied: boolean;
  total_fils: number;
}
