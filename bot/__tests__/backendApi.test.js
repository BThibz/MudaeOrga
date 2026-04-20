'use strict';

// Auto-mock axios so axios.create() returns a jest.fn()-based client
jest.mock('axios');

const axios = require('axios');

// Build a mock client and wire it up BEFORE backendApi is required,
// so that axios.create() returns it when backendApi initialises its client.
const mockClient = { post: jest.fn(), get: jest.fn() };
axios.create.mockReturnValue(mockClient);

const { syncCharacters, getCharacters } = require('../services/backendApi');

beforeEach(() => {
  // Only reset call history; mockReturnValue implementations are preserved.
  jest.clearAllMocks();
  // Re-wire after clear so axios.create still returns our client if re-required.
  axios.create.mockReturnValue(mockClient);
});

// ─── syncCharacters ──────────────────────────────────────────────────────────

describe('syncCharacters', () => {
  const characters = [
    { name: 'Rem', series: 'Re:Zero', kakera: 250, image_url: null, rank: 1, likes: 12 },
  ];

  test('POSTs characters and returns response data', async () => {
    mockClient.post.mockResolvedValueOnce({ data: { synced: 1 } });

    const result = await syncCharacters(characters);

    expect(mockClient.post).toHaveBeenCalledWith('/api/sync', { characters });
    expect(result).toEqual({ synced: 1 });
  });

  test('retries once on network error then succeeds', async () => {
    mockClient.post
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ data: { synced: 1 } });

    const result = await syncCharacters(characters);

    expect(mockClient.post).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ synced: 1 });
  });

  test('throws after exhausting all retries', async () => {
    mockClient.post.mockRejectedValue(new Error('Network failure'));

    await expect(syncCharacters(characters)).rejects.toThrow('Network failure');
    // withRetry default: 3 retries → 4 total calls
    expect(mockClient.post).toHaveBeenCalledTimes(4);
  });
});

// ─── getCharacters ───────────────────────────────────────────────────────────

describe('getCharacters', () => {
  test('GETs and returns character list', async () => {
    const mockList = [{ id: 1, name: 'Rem' }];
    mockClient.get.mockResolvedValueOnce({ data: mockList });

    const result = await getCharacters();

    expect(mockClient.get).toHaveBeenCalledWith('/api/characters');
    expect(result).toEqual(mockList);
  });

  test('throws when GET fails after retries', async () => {
    mockClient.get.mockRejectedValue(new Error('timeout'));

    await expect(getCharacters()).rejects.toThrow('timeout');
  });
});
