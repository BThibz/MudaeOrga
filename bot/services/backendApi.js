'use strict';

const axios = require('axios');
const { withRetry } = require('../utils/retry');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * POST /api/sync — send parsed characters to the backend (upsert).
 * @param {Array<{ name: string, series: string|null, kakera: number|null, image_url: string|null, rank: number|null, likes: number|null }>} characters
 * @returns {Promise<{ synced: number }>}
 */
async function syncCharacters(characters) {
  return withRetry(async () => {
    const response = await client.post('/api/sync', { characters });
    return response.data;
  });
}

/**
 * GET /api/characters — fetch the current character list.
 * @returns {Promise<Array>}
 */
async function getCharacters() {
  return withRetry(async () => {
    const response = await client.get('/api/characters');
    return response.data;
  });
}

module.exports = { syncCharacters, getCharacters, client };
