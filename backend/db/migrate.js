'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || './db/mudae.db';
    if (dbPath !== ':memory:') {
      const dir = path.dirname(path.resolve(dbPath));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function migrate() {
  const instance = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  instance.exec(schema);
}

function resetDb() {
  if (db) {
    try { db.close(); } catch {}
    db = null;
  }
}

/**
 * Wraps a function in a BEGIN/COMMIT transaction.
 * Returns a callable that behaves like better-sqlite3's db.transaction().
 */
function transaction(fn) {
  const instance = getDb();
  return function (...args) {
    instance.exec('BEGIN');
    try {
      const result = fn(...args);
      instance.exec('COMMIT');
      return result;
    } catch (e) {
      instance.exec('ROLLBACK');
      throw e;
    }
  };
}

module.exports = { getDb, migrate, resetDb, transaction };
