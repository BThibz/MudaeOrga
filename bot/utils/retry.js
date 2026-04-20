'use strict';

/**
 * Execute an async function with simple exponential-backoff retry.
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, baseDelayMs?: number }} options
 * @returns {Promise<T>}
 * @template T
 */
async function withRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { withRetry, sleep };
