require('dotenv').config();
const { initDb } = require('./db/database');
const { migrate } = require('./db/migrate');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || './data/mudaeorga.db';

async function start() {
  await initDb(DATABASE_PATH);
  migrate();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
