const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// DB_PATH can be set to a persistent volume path in cloud deployments
// e.g. DB_PATH=/data/worldcup.db on Railway/Fly.io
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'worldcup.db');

// ensure parent directory exists (required when pointing at a volume mount like /data)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db;
function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  migrate(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      pin TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      round TEXT NOT NULL,
      match_day TEXT,
      team_a TEXT NOT NULL,
      team_b TEXT NOT NULL,
      team_a_code TEXT,
      team_b_code TEXT,
      kickoff_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming',
      result TEXT,
      score_a INTEGER,
      score_b INTEGER
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      match_id INTEGER NOT NULL REFERENCES matches(id),
      prediction TEXT NOT NULL,
      is_correct INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(player_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS prediction_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      match_id INTEGER NOT NULL REFERENCES matches(id),
      prediction TEXT NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      match_id INTEGER NOT NULL REFERENCES matches(id),
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      called_at TEXT NOT NULL DEFAULT (datetime('now')),
      result TEXT
    );
  `);
}

// Safe migrations for existing databases
function migrate(db) {
  // Add pin column if upgrading from a version that didn't have it
  try { db.exec('ALTER TABLE players ADD COLUMN pin TEXT'); } catch {}
  // Add api_log if upgrading from before request tracking
  try { db.exec(`CREATE TABLE IF NOT EXISTS api_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    called_at TEXT NOT NULL DEFAULT (datetime('now')),
    result TEXT
  )`); } catch {}
}

module.exports = { getDb };
