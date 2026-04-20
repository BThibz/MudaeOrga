const BASE = import.meta.env.VITE_API_URL ?? '';

function agentLog(payload) {
  if (import.meta.env.MODE === 'test') return;
  // #region agent log
  fetch('http://127.0.0.1:7647/ingest/f4abc436-18dd-4240-a783-920d8dda030d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63a1bb' },
    body: JSON.stringify({ sessionId: '63a1bb', ...payload, timestamp: Date.now() }),
  }).catch(() => {});
  // #endregion
}

async function request(path, options = {}) {
  const fullUrl = `${BASE}${path}`;
  agentLog({
    runId: 'auth-debug-pre',
    hypothesisId: 'C',
    location: 'client.js:request:entry',
    message: 'API request start',
    data: {
      baseLen: BASE.length,
      path,
      method: options.method ?? 'GET',
      fullUrlHost: (() => {
        try {
          return new URL(fullUrl, window.location.origin).origin;
        } catch {
          return 'invalid-url';
        }
      })(),
    },
  });

  let res;
  try {
    res = await fetch(fullUrl, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (err) {
    agentLog({
      runId: 'auth-debug-pre',
      hypothesisId: 'B',
      location: 'client.js:request:catch',
      message: 'fetch network error',
      data: { path, errName: err?.name, errMsg: String(err?.message ?? err).slice(0, 200) },
    });
    throw err;
  }

  agentLog({
    runId: 'auth-debug-pre',
    hypothesisId: 'A',
    location: 'client.js:request:response',
    message: 'API response',
    data: { path, status: res.status, ok: res.ok, type: res.type },
  });

  if (res.status === 401) {
    agentLog({
      runId: 'auth-debug-pre',
      hypothesisId: 'A',
      location: 'client.js:request:401',
      message: 'Unauthorized branch',
      data: { path },
    });
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    agentLog({
      runId: 'auth-debug-pre',
      hypothesisId: 'D',
      location: 'client.js:request:httpError',
      message: 'HTTP error body',
      data: { path, status: res.status, errSnippet: String(body?.error ?? body).slice(0, 120) },
    });
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
