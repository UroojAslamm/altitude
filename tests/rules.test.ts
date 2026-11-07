import { describe, expect, it } from 'vitest';
import {
  bestDiscount, commonHourLabel, commonHourLeft, etaLabel, etaSeconds, freeShotFils, lineTotal, metersFor, pinFavorites, squadBonus, tierFor, tierProgress,
} from '@/lib/rules';

describe('pricing', () => {
  it('adds options and multiplies by quantity', () => {
    expect(lineTotal(1600, [300, 400], 2)).toBe(4600);
  });
  it('picks one best discount and never stacks', () => {
    expect(bestDiscount({ subtotalFils: 10000, tier: 'peak', squadLevel: 3, promoFils: 500, voucherFils: 800 })).toBe(1000);
    expect(bestDiscount({ subtotalFils: 10000, tier: 'summit', squadLevel: 1, voucherFils: 1200 })).toBe(1200);
  });
  it('uses squad level 3 when no tier percent applies', () => {
    expect(bestDiscount({ subtotalFils: 10000, tier: 'ridge', squadLevel: 3 })).toBe(500);
  });
  it('caps a discount at the subtotal', () => {
    expect(bestDiscount({ subtotalFils: 1000, tier: 'base_camp', squadLevel: 0, voucherFils: 2500 })).toBe(1000);
  });
  it('gives the free shot to Ridge and up, or squad L2 on Friday', () => {
    expect(freeShotFils(400, 'base_camp', 0, true)).toBe(0);
    expect(freeShotFils(400, 'ridge', 0, false)).toBe(400);
    expect(freeShotFils(400, 'base_camp', 2, false)).toBe(0);
    expect(freeShotFils(400, 'base_camp', 2, true)).toBe(400);
  });
});

describe('meters', () => {
  it('excludes tip and rounds down', () => {
    expect(metersFor(2599 + 500, 500)).toBe(25);
  });
  it('applies the Common Hour multiplier', () => {
    expect(metersFor(2000, 0, 2)).toBe(40);
  });
  it('maps thresholds to tiers', () => {
    expect(tierFor(299)).toBe('base_camp');
    expect(tierFor(300)).toBe('ridge');
    expect(tierFor(800)).toBe('summit');
    expect(tierFor(1600)).toBe('peak');
  });
  it('reports progress to the next tier', () => {
    expect(tierProgress(40)).toMatchObject({ next: 'ridge', toGo: 260 });
    expect(tierProgress(2000)).toMatchObject({ next: null, toGo: 0 });
  });
});

describe('squad bonus', () => {
  it('pays 10% rounded down', () => {
    expect(squadBonus(25, 10, 0)).toBe(2);
  });
  it('stops at the daily cap', () => {
    expect(squadBonus(200, 10, 45)).toBe(5);
    expect(squadBonus(200, 10, 50)).toBe(0);
  });
});

describe('ETA', () => {
  it('splits work across baristas', () => {
    expect(etaSeconds(300, 120, 2)).toBe(210);
    expect(etaLabel(210)).toBe('about 4 min');
  });
});

describe('Common Hour', () => {
  it('uses Dubai time regardless of the machine zone', () => {
    const inside = new Date('2026-11-09T11:00:00Z'); // Monday 15:00 Dubai
    const outside = new Date('2026-11-09T13:00:00Z'); // Monday 17:00 Dubai
    expect(commonHourLeft('14:00', '16:00', [1, 2, 3, 4, 5], inside)).toBe(60);
    expect(commonHourLeft('14:00', '16:00', [1, 2, 3, 4, 5], outside)).toBeNull();
  });
});

describe('owner review helpers', () => {
  it('labels Common Hour in plain time', () => {
    expect(commonHourLabel('12:00:00', '13:00:00')).toBe('12 to 1 PM');
    expect(commonHourLabel('14:00', '16:00')).toBe('2 to 4 PM');
    expect(commonHourLabel('11:00', '13:00')).toBe('11 AM to 1 PM');
  });

  it('pins favorites first and keeps the rest in order', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(pinFavorites(items, new Set(['c', 'b'])).map((i) => i.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(pinFavorites(items, undefined)).toBe(items);
  });
});
