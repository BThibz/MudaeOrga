import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUIStore } from '../store/useUIStore.js';

beforeEach(() => {
  useUIStore.setState({
    filters: { series: '', group_id: null, kakera_min: '', kakera_max: '' },
    viewMode: 'grid',
    optimisticOrder: null,
    groupModalOpen: false,
  });
});

describe('useUIStore', () => {
  it('setFilters merges partial updates', () => {
    const { result } = renderHook(() => useUIStore());
    act(() => result.current.setFilters({ series: 'Naruto' }));
    expect(result.current.filters.series).toBe('Naruto');
    expect(result.current.filters.group_id).toBeNull();
  });

  it('resetFilters clears all filters', () => {
    const { result } = renderHook(() => useUIStore());
    act(() => result.current.setFilters({ series: 'Naruto', kakera_min: '100' }));
    act(() => result.current.resetFilters());
    expect(result.current.filters).toEqual({
      series: '',
      group_id: null,
      kakera_min: '',
      kakera_max: '',
    });
  });

  it('setViewMode toggles between grid and list', () => {
    const { result } = renderHook(() => useUIStore());
    expect(result.current.viewMode).toBe('grid');
    act(() => result.current.setViewMode('list'));
    expect(result.current.viewMode).toBe('list');
  });

  it('setOptimisticOrder stores an array of ids', () => {
    const { result } = renderHook(() => useUIStore());
    act(() => result.current.setOptimisticOrder([3, 1, 2]));
    expect(result.current.optimisticOrder).toEqual([3, 1, 2]);
  });

  it('clearOptimisticOrder resets to null', () => {
    const { result } = renderHook(() => useUIStore());
    act(() => result.current.setOptimisticOrder([1, 2]));
    act(() => result.current.clearOptimisticOrder());
    expect(result.current.optimisticOrder).toBeNull();
  });

  it('openGroupModal / closeGroupModal toggle modal flag', () => {
    const { result } = renderHook(() => useUIStore());
    act(() => result.current.openGroupModal());
    expect(result.current.groupModalOpen).toBe(true);
    act(() => result.current.closeGroupModal());
    expect(result.current.groupModalOpen).toBe(false);
  });
});
