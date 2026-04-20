import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { charactersApi } from '../api/characters.js';
import { useUIStore } from '../store/useUIStore.js';

export function useCharacters() {
  const filters = useUIStore((s) => s.filters);
  return useQuery({
    queryKey: ['characters', filters],
    queryFn: () => charactersApi.list(filters),
    staleTime: 30_000,
  });
}

export function useReorder() {
  const qc = useQueryClient();
  const setOptimisticOrder = useUIStore((s) => s.setOptimisticOrder);
  const clearOptimisticOrder = useUIStore((s) => s.clearOptimisticOrder);
  const filters = useUIStore((s) => s.filters);

  return useMutation({
    mutationFn: charactersApi.reorder,
    onMutate: (ids) => {
      setOptimisticOrder(ids);
    },
    onError: () => {
      clearOptimisticOrder();
    },
    onSuccess: () => {
      clearOptimisticOrder();
      qc.invalidateQueries({ queryKey: ['characters', filters] });
    },
  });
}

export function useSetGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, group_id }) => charactersApi.setGroup(id, group_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => charactersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}
