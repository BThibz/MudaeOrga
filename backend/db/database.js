const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let instance = null;

function getDb(dbPath) {
  if (instance) return instance;
  const resolvedPath = dbPath || process.env.DATABASE_PATH || './db/mudaeorga.sqlite';
  const dir = path.dirname(resolvedPath);
  if (resolvedPath !== ':memory:' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  instance = new DatabaseSync(resolvedPath);
  instance.exec('PRAGMA journal_mode = WAL');
  instance.exec('PRAGMA foreign_keys = ON');
  return instance;
}

function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

module.exports = { getDb, closeDb };
