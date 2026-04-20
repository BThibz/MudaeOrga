const { initDb } = require('../db/database');
const { migrate } = require('../db/migrate');
const { createApp } = require('../app');

let app = null;

async function setupTestApp() {
  // Use in-memory database for tests (no file path → empty DB each time)
  await initDb(':memory:');
  migrate();
  app = createApp();
  return app;
}

function getApp() {
  return app;
}

module.exports = { setupTestApp, getApp };
