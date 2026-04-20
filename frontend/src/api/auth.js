import { api } from './client.js';

export const authApi = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout', {}),
  loginUrl: () => `${import.meta.env.VITE_API_URL ?? ''}/auth/discord`,
};
