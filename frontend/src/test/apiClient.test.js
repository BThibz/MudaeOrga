import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('api/client', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, name: 'Test' }),
    });

    const { api } = await import('../api/client.js');
    const result = await api.get('/api/characters');
    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  it('throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    const { api } = await import('../api/client.js');
    await expect(api.get('/api/characters/999')).rejects.toThrow('Not found');
  });

  it('returns null on 204', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    });

    const { api } = await import('../api/client.js');
    const result = await api.delete('/api/characters/1');
    expect(result).toBeNull();
  });

  it('sends correct method and body for PUT', async () => {
    let captured;
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      captured = opts;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    });

    const { api } = await import('../api/client.js');
    await api.put('/api/characters/reorder', { ids: [3, 1, 2] });

    expect(captured.method).toBe('PUT');
    expect(JSON.parse(captured.body)).toEqual({ ids: [3, 1, 2] });
  });
});
