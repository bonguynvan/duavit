import { createHash, randomBytes } from 'node:crypto';

const DAY_MS = 24 * 60 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/** Users + login sessions. Session tokens are stored only as SHA-256 hashes. */
export class AuthStore {
  /** @param {import('node:sqlite').DatabaseSync} db */
  constructor(db, { sessionDays = 30, adminEmails = [] } = {}) {
    this.db = db;
    this.sessionMs = sessionDays * DAY_MS;
    this.adminEmails = new Set(adminEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
    this.q = {
      findBySub: db.prepare('SELECT * FROM users WHERE google_sub = ?'),
      findById: db.prepare('SELECT * FROM users WHERE id = ?'),
      insert: db.prepare('INSERT INTO users (google_sub, email, name, role, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)'),
      touch: db.prepare('UPDATE users SET email = ?, name = ?, role = ?, last_login_at = ? WHERE id = ?'),
      ban: db.prepare('UPDATE users SET banned = ? WHERE id = ?'),
      newSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
      sessionUser: db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
                               WHERE sessions.token_hash = ? AND sessions.expires_at > ?`),
      dropSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
      dropUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
      purge: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
      list: db.prepare(`SELECT id, email, name, role, banned, created_at, last_login_at FROM users
                        WHERE (? = '' OR email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')
                        ORDER BY last_login_at DESC LIMIT ?`),
      countUsers: db.prepare('SELECT COUNT(*) AS n FROM users'),
      countSessions: db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?'),
      newLink: db.prepare('INSERT INTO login_links (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
      takeLink: db.prepare('DELETE FROM login_links WHERE token_hash = ? RETURNING user_id, expires_at'),
      purgeLinks: db.prepare('DELETE FROM login_links WHERE expires_at <= ?'),
    };
  }

  #roleFor(email) {
    return this.isAdminEmail(email) ? 'admin' : 'user';
  }

  isAdminEmail(email) {
    return this.adminEmails.has(String(email).toLowerCase());
  }

  /** The stored role is only a snapshot from login; the current ADMIN_EMAILS always wins. */
  #withRole(user) {
    return user ? { ...user, role: this.#roleFor(user.email) } : null;
  }

  /** Create or refresh the user for a verified Google identity. */
  upsertGoogleUser({ sub, email, name }, now) {
    const role = this.#roleFor(email);
    const existing = this.q.findBySub.get(sub);
    if (existing) {
      this.q.touch.run(email, name, role, now, existing.id);
      return this.getUser(existing.id);
    }
    const { lastInsertRowid } = this.q.insert.run(sub, email, name, role, now, now);
    return this.getUser(Number(lastInsertRowid));
  }

  /** Admin account for a server-made sign-in link (no Google identity behind it). */
  upsertLocalAdmin(email, now) {
    const address = String(email).trim().toLowerCase();
    return this.upsertGoogleUser({ sub: `local:${address}`, email: address, name: address.split('@')[0] }, now);
  }

  /** @returns {string} raw one-time token (only its hash is stored) */
  createLoginLink(userId, now, ttlMs) {
    this.q.purgeLinks.run(now);
    const token = randomBytes(32).toString('hex');
    this.q.newLink.run(hashToken(token), userId, now + ttlMs);
    return token;
  }

  /** Use up a sign-in link: the user it was made for, or null (unknown, used, expired or banned). */
  redeemLoginLink(token, now) {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
    const link = this.q.takeLink.get(hashToken(token)); // deleted whatever happens next: single use
    if (!link || link.expires_at <= now) return null;
    const user = this.getUser(link.user_id);
    return user && !user.banned ? user : null;
  }

  getUser(id) {
    return this.#withRole(this.q.findById.get(id));
  }

  /** @returns {string} the raw token (only ever stored hashed) */
  createSession(userId, now) {
    const token = randomBytes(32).toString('hex');
    this.q.newSession.run(hashToken(token), userId, now, now + this.sessionMs);
    return token;
  }

  /** User for a session token, or null if unknown, expired or banned. */
  userForToken(token, now) {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
    const user = this.q.sessionUser.get(hashToken(token), now);
    return user && !user.banned ? this.#withRole(user) : null;
  }

  deleteSession(token) {
    if (typeof token === 'string') this.q.dropSession.run(hashToken(token));
  }

  /** Ban (or unban) a user; banning also logs them out everywhere. */
  setBanned(userId, banned) {
    this.q.ban.run(banned ? 1 : 0, userId);
    if (banned) this.q.dropUserSessions.run(userId);
  }

  /** Most recently active users first; `query` matches email or name. */
  listUsers({ query = '', limit = 100 } = {}) {
    const q = String(query).trim().slice(0, 100);
    const like = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    return this.q.list.all(q, like, like, Math.min(500, Math.max(1, limit))).map((u) => this.#withRole(u));
  }

  stats(now) {
    return { users: this.q.countUsers.get().n, activeSessions: this.q.countSessions.get(now).n };
  }

  purgeExpired(now) {
    return Number(this.q.purge.run(now).changes);
  }
}

/** What the browser is allowed to see about a user. */
export const publicUser = (user) => user && { id: user.id, name: user.name, email: user.email, role: user.role };
