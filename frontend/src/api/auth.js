import { api } from './client.js';

function loginUrl() {
  const u = `${import.meta.env.VITE_API_URL ?? ''}/auth/discord`;
  if (import.meta.env.MODE !== 'test') {
    // #region agent log
    fetch('http://127.0.0.1:7647/ingest/f4abc436-18dd-4240-a783-920d8dda030d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63a1bb' },
      body: JSON.stringify({
        sessionId: '63a1bb',
        runId: 'auth-debug-pre',
        hypothesisId: 'C',
        location: 'auth.js:loginUrl',
        message: 'Discord login URL built',
        data: {
          viteApiUrlLen: (import.meta.env.VITE_API_URL ?? '').length,
          isRelative: !(import.meta.env.VITE_API_URL ?? '').length,
          urlPathPrefix: u.slice(0, 24),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }
  return u;
}

export const authApi = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout', {}),
  loginUrl,
};
