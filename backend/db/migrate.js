const fs = require('fs');
const path = require('path');
const { getDb, persist } = require('./database');

function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const db = getDb();
  db.run(schema);
  persist();
  console.log('[db] Migration applied');
}

module.exports = { migrate };
