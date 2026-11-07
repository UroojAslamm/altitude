// Display helpers and a pure mirror of the database rules, used for labels and tests.
// The database functions stay the source of truth for every real order.
import type { Tier } from '@/components/ui';

export const aed = (fils: number) => `AED ${(fils / 100).toFixed(fils % 100 === 0 ? 0 : 2)}`;

export interface Thresholds { ridge: number; summit: number; peak: number }

export const DEFAULT_THRESHOLDS: Thresholds = { ridge: 300, summit: 800, peak: 1600 };

export function tierFor(meters: number, t: Thresholds = DEFAULT_THRESHOLDS): Tier {
  if (meters >= t.peak) return 'peak';
  if (meters >= t.summit) return 'summit';
  if (meters >= t.ridge) return 'ridge';
  return 'base_camp';
}

/** Progress inside the current tier: next tier, meters to go, and 0-1 fraction. */
export function tierProgress(meters: number, t: Thresholds = DEFAULT_THRESHOLDS) {
  const steps: Array<[Tier, number]> = [['base_camp', 0], ['ridge', t.ridge], ['summit', t.summit], ['peak', t.peak]];
  const index = steps.map(([, v]) => meters >= v).lastIndexOf(true);
  const next = steps[index + 1];
  if (!next) return { next: null, toGo: 0, fraction: 1 };
  const floor = steps[index]![1];
  return { next: next[0], toGo: next[1] - meters, fraction: (meters - floor) / (next[1] - floor) };
}

export interface DiscountInput {
  subtotalFils: number;
  tier: Tier;
  squadLevel: number;
  promoFils?: number;
  voucherFils?: number;
}

/** Single best discount. Discounts never stack. */
export function bestDiscount({ subtotalFils, tier, squadLevel, promoFils = 0, voucherFils = 0 }: DiscountInput) {
  const tierPct = tier === 'peak' ? 10 : tier === 'summit' ? 5 : 0;
  const candidates = [
    Math.floor((subtotalFils * tierPct) / 100),
    squadLevel >= 3 ? Math.floor((subtotalFils * 5) / 100) : 0,
    promoFils,
    voucherFils,
  ];
  return Math.min(Math.max(...candidates), subtotalFils);
}

export function lineTotal(baseFils: number, optionDeltas: number[], qty: number) {
  return (baseFils + optionDeltas.reduce((s, d) => s + d, 0)) * qty;
}

/** One free extra shot per order for Ridge and above, or squad level 2 on Fridays. */
export function freeShotFils(shotFils: number, tier: Tier, squadLevel: number, isFriday: boolean) {
  return tier !== 'base_camp' || (squadLevel >= 2 && isFriday) ? shotFils : 0;
}

/** 1 meter per AED after discount, excluding tip, rounded down, then Common Hour. */
export function metersFor(totalFils: number, tipFils: number, multiplier = 1) {
  return Math.floor((totalFils - tipFils) / 100) * multiplier;
}

export function squadBonus(earned: number, pct: number, usedToday: number, cap = 50) {
  return Math.min(Math.floor((earned * pct) / 100), Math.max(cap - usedToday, 0));
}

export function etaSeconds(aheadSeconds: number, ownSeconds: number, baristas: number) {
  return Math.floor((aheadSeconds + ownSeconds) / Math.max(baristas, 1));
}

export function etaLabel(seconds: number) {
  return `about ${Math.max(1, Math.round(seconds / 60))} min`;
}

const DUBAI = 'Asia/Dubai';
export function dubaiTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: DUBAI, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
export function dubaiDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: DUBAI, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}
/** Current Dubai wall clock: ISO weekday 1-7 and minutes since midnight. */
export function dubaiClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: DUBAI, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { dow, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Minutes left in Common Hour, or null when it is not running. */
export function commonHourLeft(start: string, end: string, days: number[], now = new Date()) {
  const { dow, minutes } = dubaiClock(now);
  if (!days.includes(dow) || minutes < toMinutes(start) || minutes >= toMinutes(end)) return null;
  return toMinutes(end) - minutes;
}

const clockHour = (t: string) => {
  const h = Number(t.slice(0, 2));
  return { hour: h % 12 || 12, half: h < 12 ? 'AM' : 'PM' };
};

/** "12:00" and "13:00" become "12 to 1 PM". */
export function commonHourLabel(start: string, end: string) {
  const a = clockHour(start);
  const b = clockHour(end);
  return `${a.hour}${a.half === b.half ? '' : ` ${a.half}`} to ${b.hour} ${b.half}`;
}

/** Favorites first. Otherwise the menu keeps its order. */
/** The one item shown being made. Drinks come before food, because they have something to fill. */
export function prepItem<L extends { menu_item_id: string }, M extends { id: string; kind: string }>(lines: L[], items: M[]) {
  const matched = lines.map((line) => ({ line, item: items.find((i) => i.id === line.menu_item_id) }));
  return matched.find((m) => m.item && m.item.kind !== 'bakery') ?? matched[0];
}

/** "a Latte" or "an Acai Bowl". */
export function withArticle(name: string) {
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

export function pinFavorites<T extends { id: string }>(items: T[], favorites: ReadonlySet<string> | undefined) {
  if (!favorites?.size) return items;
  return [...items.filter((i) => favorites.has(i.id)), ...items.filter((i) => !favorites.has(i.id))];
}

const ERRORS: Array<[RegExp, string]> = [
  [/ITEM_UNAVAILABLE:(.+)/, '$1 just sold out. Pick another?'],
  [/OPTION_UNAVAILABLE:(.+)/, '$1 just ran out. Pick another option?'],
  [/OPTION_REQUIRED:(.+)/, 'Choose a $1 first.'],
  [/NOT_ACCEPTING/, 'The counter has paused new orders for a moment.'],
  [/CLOSED/, 'Altitude is closed right now.'],
  [/VOUCHER_INVALID/, 'That voucher has expired or was already used.'],
  [/ALREADY_IN_SQUAD/, "You're already in a squad."],
  [/SQUAD_NOT_FOUND/, "That code didn't match a squad."],
  [/SQUAD_FULL/, 'That squad is full.'],
  [/REVIEW_NEEDS_ORDER/, 'Order this item first, then review it.'],
  [/ALREADY_TIPPED/, 'This order already has a tip. Thank you.'],
  [/NO_TICKETS/, 'No spin tickets yet. Every 5 orders earns one.'],
  [/FORBIDDEN/, "You don't have access to do that."],
  [/ILLEGAL_TRANSITION/, 'That order has already moved on.'],
];

export function friendlyError(message: string) {
  for (const [re, text] of ERRORS) {
    const m = message.match(re);
    if (m) return text.replace('$1', m[1] ?? '');
  }
  return 'Something went wrong. Try again.';
}
