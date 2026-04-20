const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

function migrate(db) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

if (require.main === module) {
  const db = getDb();
  migrate(db);
  console.log('Migration terminée.');
}

module.exports = { migrate };
