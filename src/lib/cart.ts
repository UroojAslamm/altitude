import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  kind: string;
  accent: string;
  unitFils: number;
  qty: number;
  optionIds: string[];
  optionNames: string[];
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const keyOf = (itemId: string, optionIds: string[]) => [itemId, ...[...optionIds].sort()].join('|');

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const key = keyOf(line.itemId, line.optionIds);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return { lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + line.qty) } : l)) };
          }
          return { lines: [...s.lines, { ...line, key }] };
        }),
      setQty: (key, qty) => set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, qty } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'ascend-cart' },
  ),
);

export const cartPayload = (lines: CartLine[]) =>
  lines.map((l) => ({ item_id: l.itemId, qty: l.qty, option_ids: l.optionIds }));
