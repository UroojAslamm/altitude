import { describe, expect, it } from 'vitest';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const pairs: Array<[string, string, string]> = [
  ['cream-50 on ink-900', '#FBF7EF', '#14110F'],
  ['cream-50 on ink-800', '#FBF7EF', '#1E1A17'],
  ['cream-300 on ink-900', '#CDBFA6', '#14110F'],
  ['cream-300 on ink-800', '#CDBFA6', '#1E1A17'],
  ['cream-300 on ink-700', '#CDBFA6', '#2A2420'],
  ['glow-300 on ink-900', '#FFD58A', '#14110F'],
  ['ink-900 on glow-500 (primary button)', '#14110F', '#F5B14A'],
  ['cream-50 on maroon-700', '#FBF7EF', '#6B1B26'],
  ['cream-50 on navy-700', '#FBF7EF', '#2E3C93'],
  ['mango-400 on ink-800', '#F4B63F', '#1E1A17'],
];

describe('WCAG AA contrast', () => {
  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
