const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');

let db = null;

function getDb() {
  if (db) return db;

  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'flareddns.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema();
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS dns_records (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      proxied INTEGER DEFAULT 0,
      ttl INTEGER DEFAULT 1,
      last_updated TEXT,
      FOREIGN KEY (zone_id) REFERENCES zones(id)
    );

    CREATE TABLE IF NOT EXISTS update_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      hostname TEXT NOT NULL,
      ip TEXT,
      source_ip TEXT,
      response TEXT NOT NULL,
      username TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_update_log_timestamp ON update_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_update_log_hostname ON update_log(hostname);
    CREATE INDEX IF NOT EXISTS idx_dns_records_name ON dns_records(name);
  `);
}

function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, getSetting, setSetting, close };
