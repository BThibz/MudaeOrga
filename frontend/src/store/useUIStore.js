import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // filters
  filters: { series: '', group_id: null, kakera_min: '', kakera_max: '' },
  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () =>
    set({ filters: { series: '', group_id: null, kakera_min: '', kakera_max: '' } }),

  // view mode: 'grid' | 'list'
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),

  // optimistic ordered IDs (null = use server order)
  optimisticOrder: null,
  setOptimisticOrder: (ids) => set({ optimisticOrder: ids }),
  clearOptimisticOrder: () => set({ optimisticOrder: null }),

  // group modal
  groupModalOpen: false,
  openGroupModal: () => set({ groupModalOpen: true }),
  closeGroupModal: () => set({ groupModalOpen: false }),
}));
