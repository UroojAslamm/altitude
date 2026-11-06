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
  [/CLUB_LIMIT/, 'You can join up to 3 clubs.'],
  [/REVIEW_NEEDS_ORDER/, 'Order this item first, then review it.'],
  [/ALREADY_SUBMITTED/, 'You already submitted a drink this month.'],
  [/OWN_SUBMISSION/, "You can't vote for your own drink."],
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
