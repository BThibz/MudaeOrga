import { api } from './client.js';

export const charactersApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.series)     params.set('series', filters.series);
    if (filters.group_id)   params.set('group_id', filters.group_id);
    if (filters.kakera_min) params.set('kakera_min', filters.kakera_min);
    if (filters.kakera_max) params.set('kakera_max', filters.kakera_max);
    const qs = params.toString();
    return api.get(`/api/characters${qs ? `?${qs}` : ''}`);
  },

  reorder: (ids) => api.put('/api/characters/reorder', { ids }),

  setGroup: (id, group_id) => api.put(`/api/characters/${id}/group`, { group_id }),

  remove: (id) => api.delete(`/api/characters/${id}`),
};
