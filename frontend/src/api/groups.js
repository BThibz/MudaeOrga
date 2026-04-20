import { api } from './client.js';

export const groupsApi = {
  list: () => api.get('/api/groups'),
  create: (name, color) => api.post('/api/groups', { name, color }),
  remove: (id) => api.delete(`/api/groups/${id}`),
};
