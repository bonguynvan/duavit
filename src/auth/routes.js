import { randomBytes } from 'node:crypto';
import { authorizationUrl, exchangeCode, identityFromIdToken, pkcePair } from './google.js';
import { parseCookies, serializeCookie } from './cookies.js';
import { publicUser } from './store.js';

export const SESSION_COOKIE = 'peti_sid';
const STATE_COOKIE = 'peti_oauth';
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING = 10000;
const MAX_PENDING_PER_IP = 20; // one browser can't fill the table and lock everyone out

/** Only same-site relative paths: never redirect off-site after login (open redirect). */
export function safeReturnTo(value) {
  return typeof value === 'string' && /^\/(?![/\\])[\w\-./?=&%]*$/.test(value) ? value : '/';
}

/**
 * State-changing requests must come from our own pages. SameSite=Lax already keeps the
 * session cookie off cross-site POSTs; checking Origin is the second lock.
 */
export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return req.method === 'GET' || req.method === 'HEAD';
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/**
 * Google sign-in + session routes.
 * @param {import('express').Express} app
 * @param {{
 *   store: import('./store.js').AuthStore, clientId?: string, clientSecret?: string,
 *   baseUrl: (req) => string, ipOf: (req) => string, secureCookies: boolean,
 *   fetchImpl?: typeof fetch, devLogin?: boolean,
 * }} opts
 */
export function registerAuth(app, { store, clientId, clientSecret, baseUrl, ipOf, secureCookies, fetchImpl, devLogin = false }) {
  const pending = new Map(); // state -> { verifier, returnTo, expires, ip }
  const pendingPerIp = new Map(); // ip -> open sign-ins
  const dropPending = (state) => {
    const flow = pending.get(state);
    if (!flow) return undefined;
    pending.delete(state);
    const left = (pendingPerIp.get(flow.ip) ?? 1) - 1;
    if (left <= 0) pendingPerIp.delete(flow.ip);
    else pendingPerIp.set(flow.ip, left);
    return flow;
  };
  const googleEnabled = Boolean(clientId && clientSecret);

  const cookie = (name, value, maxAgeSec, path = '/') => serializeCookie(name, value, { maxAgeSec, secure: secureCookies, path });
  const startSession = (res, user) => {
    const token = store.createSession(user.id, Date.now());
    res.append('Set-Cookie', cookie(SESSION_COOKIE, token, store.sessionMs / 1000));
  };

  // Every request learns who is logged in (or not).
  app.use((req, _res, next) => {
    req.user = store.userForToken(parseCookies(req.headers.cookie)[SESSION_COOKIE], Date.now());
    next();
  });

  app.get('/auth/google', (req, res) => {
    if (!googleEnabled) return res.status(503).type('text/plain; charset=utf-8').send('Đăng nhập Google chưa được cấu hình trên máy chủ này.');
    const now = Date.now();
    for (const [key, value] of pending) if (value.expires < now) dropPending(key);
    const ip = ipOf(req);
    if ((pendingPerIp.get(ip) ?? 0) >= MAX_PENDING_PER_IP) return res.status(429).type('text/plain; charset=utf-8').send('Bấm đăng nhập nhiều quá, đợi vài phút nhé.');
    if (pending.size >= MAX_PENDING) return res.status(503).type('text/plain; charset=utf-8').send('Máy chủ bận, thử lại sau.');
    const state = randomBytes(24).toString('base64url');
    const { verifier, challenge } = pkcePair();
    pending.set(state, { verifier, returnTo: safeReturnTo(req.query.returnTo), expires: now + STATE_TTL_MS, ip });
    pendingPerIp.set(ip, (pendingPerIp.get(ip) ?? 0) + 1);
    // Bind the state to this browser too, so a login link can't be replayed in someone else's.
    res.append('Set-Cookie', cookie(STATE_COOKIE, state, STATE_TTL_MS / 1000, '/auth'));
    return res.redirect(302, authorizationUrl({ clientId, redirectUri: `${baseUrl(req)}/auth/google/callback`, state, challenge }));
  });

  app.get('/auth/google/callback', async (req, res) => {
    const { state, code, error } = req.query;
    const flow = typeof state === 'string' ? dropPending(state) : undefined; // single use
    res.append('Set-Cookie', cookie(STATE_COOKIE, '', 0, '/auth'));
    if (error) return res.redirect(302, '/?login=cancelled');
    const cookieState = parseCookies(req.headers.cookie)[STATE_COOKIE];
    if (!flow || flow.expires < Date.now() || cookieState !== state || typeof code !== 'string') {
      return res.status(400).type('text/plain; charset=utf-8').send('Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Thử đăng nhập lại.');
    }
    try {
      const tokens = await exchangeCode({ code, verifier: flow.verifier, clientId, clientSecret, redirectUri: `${baseUrl(req)}/auth/google/callback`, fetchImpl });
      const identity = identityFromIdToken(tokens.id_token, { clientId });
      const user = store.upsertGoogleUser(identity, Date.now());
      if (user.banned) return res.status(403).type('text/plain; charset=utf-8').send('Tài khoản này đã bị khóa.');
      startSession(res, user);
      return res.redirect(302, flow.returnTo);
    } catch (err) {
      console.warn('[auth] Google sign-in failed:', err.message);
      return res.status(400).type('text/plain; charset=utf-8').send('Không đăng nhập được bằng Google. Thử lại nhé.');
    }
  });

  // Local development only: fake sign-in without Google credentials. Never in production.
  if (devLogin) {
    app.get('/auth/dev', (req, res) => {
      const name = String(req.query.name ?? 'Dev').slice(0, 40) || 'Dev';
      const user = store.upsertGoogleUser({ sub: `dev:${name}`, email: `${name.toLowerCase().replace(/\W+/g, '')}@dev.local`, name }, Date.now());
      startSession(res, user);
      res.redirect(302, safeReturnTo(req.query.returnTo));
    });
  }

  app.post('/auth/logout', (req, res) => {
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'Yêu cầu không hợp lệ' });
    store.deleteSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    res.append('Set-Cookie', cookie(SESSION_COOKIE, '', 0));
    return res.json({ ok: true });
  });

  app.get('/api/me', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ user: publicUser(req.user), loginEnabled: googleEnabled || devLogin, devLogin });
  });
}
