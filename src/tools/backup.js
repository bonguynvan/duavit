// Consistent online backup of the SQLite database (safe while the app is running).
// Usage (inside the container): node src/tools/backup.js [/app/data/backups]
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const source = process.env.DB_PATH || './data/duavit.sqlite';
const dir = process.argv[2] || path.join(path.dirname(source), 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(dir, `duavit-${stamp}.sqlite`);

const db = new DatabaseSync(source, { readOnly: true });
// VACUUM INTO writes a compact, consistent copy without blocking writers for long.
db.prepare('VACUUM INTO ?').run(target);
db.close();
console.info(`backup written: ${target}`);
