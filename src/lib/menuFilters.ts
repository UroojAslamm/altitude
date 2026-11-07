import { create } from 'zustand';

export interface Filters { tags: string[]; maxPrice: number; temp: 'any' | 'hot' | 'cold'; caffeine: number | null }
export const EMPTY_FILTERS: Filters = { tags: [], maxPrice: 3000, temp: 'any', caffeine: null };

interface MenuFilters {
  category: string | null;
  query: string;
  filters: Filters;
  setCategory: (category: string | null) => void;
  setQuery: (query: string) => void;
  setFilters: (update: Filters | ((current: Filters) => Filters)) => void;
}

/** Lives outside the page so opening an item and coming back keeps the student's filters. */
export const useMenuFilters = create<MenuFilters>((set) => ({
  category: null,
  query: '',
  filters: EMPTY_FILTERS,
  setCategory: (category) => set({ category }),
  setQuery: (query) => set({ query }),
  setFilters: (update) => set((s) => ({ filters: typeof update === 'function' ? update(s.filters) : update })),
}));
