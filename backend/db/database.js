const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPath = null;

async function initDb(filePath) {
  const SQL = await initSqlJs();
  dbPath = filePath === ':memory:' ? null : filePath;

  if (dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = dbPath && fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = new SQL.Database(buffer);

  db.run('PRAGMA foreign_keys = ON;');

  return db;
}

function persist() {
  if (db && dbPath) {
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Helper: run a statement that returns no rows (INSERT/UPDATE/DELETE)
function run(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  persist();
  return { lastInsertRowid: d.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] };
}

// Helper: get all rows from a query
function all(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: get a single row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] ?? null;
}

module.exports = { initDb, persist, getDb, run, all, get };
