import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Each entry runs once, in order; PRAGMA user_version remembers how far we got.
const MIGRATIONS = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     google_sub TEXT NOT NULL UNIQUE,
     email TEXT NOT NULL,
     name TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'user',
     banned INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     last_login_at INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE INDEX sessions_expiry ON sessions(expires_at);`,
  // One-time admin sign-in links made on the server (src/tools/admin-link.js); stored hashed, like sessions.
  `CREATE TABLE login_links (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL
   );`,
  // Operator dashboard: daily counters (numbers only) and site-wide switches (maintenance, announcement).
  `CREATE TABLE daily_stats (
     day TEXT NOT NULL,
     metric TEXT NOT NULL,
     value INTEGER NOT NULL,
     PRIMARY KEY (day, metric)
   );
   CREATE TABLE settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );`,
];

/**
 * Open (and migrate) the SQLite database. ':memory:' for tests.
 * Thin wrapper on node:sqlite so the driver can be swapped in one place.
 */
export function openDatabase(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  MIGRATIONS.slice(version).forEach((sql, i) => {
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version + i + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });
  return db;
}
