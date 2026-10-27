import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import QRCode from 'qrcode';
import { Server } from 'socket.io';
import { RoomManager, normalizeCode } from './rooms/roomManager.js';
import { openDatabase } from './db.js';
import { AuthStore } from './auth/store.js';
import { isSameOrigin, registerAuth } from './auth/routes.js';
import { clientIp, closeRoom, publicBaseUrl, registerSockets, roomLinks, sweepRooms, tickRooms } from './sockets.js';
import { isGa4Id } from '../shared/analyticsUrl.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const TICK_MS = 50;
const SWEEP_MS = 60 * 1000;
const CREATE_WINDOW_MS = 60 * 1000;

// Google Analytics hosts, allowed only when a GA4_ID is configured.
const GA_SCRIPT = 'https://www.googletagmanager.com';
const GA_HOSTS = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';

const cspFor = (analytics) => [
  "default-src 'self'",
  `script-src 'self'${analytics ? ` ${GA_SCRIPT}` : ''}`,
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data:${analytics ? ` ${GA_HOSTS}` : ''}`,
  "media-src 'self' blob:",
  `connect-src 'self' ws: wss:${analytics ? ` ${GA_HOSTS}` : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = (csp) => (_req, res, next) => {
  res.set({
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', // keeps ?key=… host links out of Referer headers
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
};

/** Reject cross-site WebSocket/polling requests (another site's page driving our sockets). */
function sameOrigin(req, cb) {
  const origin = req.headers.origin;
  if (!origin) return cb(null, true); // non-browser clients
  try {
    cb(null, new URL(origin).host === req.headers.host);
  } catch {
    cb(null, false);
  }
}

/** Small fixed-window limiter for room creation: N per IP per minute. */
function createLimiter(maxPerWindow) {
  const hits = new Map();
  const allow = (ip, now) => {
    const slot = hits.get(ip);
    if (!slot || now - slot.start >= CREATE_WINDOW_MS) {
      hits.set(ip, { start: now, count: 1 });
      return true;
    }
    slot.count += 1;
    return slot.count <= maxPerWindow;
  };
  /** Forget finished windows so rotating addresses can't grow the map forever. */
  allow.prune = (now) => {
    for (const [ip, slot] of hits) if (now - slot.start >= CREATE_WINDOW_MS) hits.delete(ip);
  };
  return allow;
}

/**
 * @param {{
 *   port?: number, publicUrl?: string, trustProxy?: boolean,
 *   roomLimits?: object, maxSocketsPerIp?: number, createPerMinute?: number,
 *   createRoom?: () => import('./game/room.js').Room,
 *   db?: import('node:sqlite').DatabaseSync, requireLogin?: boolean, ga4Id?: string,
 *   auth?: { clientId?: string, clientSecret?: string, adminEmails?: string[], sessionDays?: number,
 *            secureCookies?: boolean, devLogin?: boolean, fetchImpl?: typeof fetch },
 * }} [opts]
 */
export async function startServer({
  port = 3000,
  publicUrl = '',
  trustProxy = false,
  roomLimits = {},
  maxSocketsPerIp = 10,
  createPerMinute = 5,
  createRoom,
  db = openDatabase(':memory:'),
  requireLogin = false, // ROOMS_REQUIRE_LOGIN=1 brings back "sign in to create a room"
  ga4Id = '', // Google Analytics 4 measurement id; empty (or malformed) = no analytics at all
  auth = {},
} = {}) {
  const analyticsId = isGa4Id(ga4Id) ? ga4Id : null;
  const rooms = new RoomManager({ ...roomLimits, createRoom });
  const store = new AuthStore(db, { sessionDays: auth.sessionDays, adminEmails: auth.adminEmails ?? [] });
  const baseUrl = (req) => publicBaseUrl(req.headers, { publicUrl, trustProxy });
  const allowCreate = createLimiter(createPerMinute);
  // Changes on every server start; open tabs reload themselves when they see a new one.
  const buildId = randomBytes(4).toString('hex');

  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders(cspFor(Boolean(analyticsId))));
  // The browser learns the GA4 id from here (CSP allows no inline scripts). Loaded only after consent.
  app.get('/analytics-config.js', (_req, res) => {
    res.type('application/javascript').set('Cache-Control', 'no-cache').send(`export const GA4_ID = ${JSON.stringify(analyticsId)};\n`);
  });

  // Static assets only (pages are served by the routes below, never by path).
  const noCache = (res) => res.set('Cache-Control', 'no-cache'); // revalidate (ETag) so updates land at once
  for (const dir of ['css', 'js', 'music']) {
    app.use(`/${dir}`, express.static(path.join(PUBLIC, dir), { setHeaders: noCache, index: false }));
  }
  app.use('/shared', express.static(path.join(ROOT, 'shared'), { setHeaders: noCache, index: false }));
  app.get('/favicon.svg', (_req, res) => res.set('Cache-Control', 'public, max-age=86400').sendFile(path.join(PUBLIC, 'favicon.svg')));
  app.get('/favicon.ico', (_req, res) => res.redirect(301, '/favicon.svg')); // browsers and bots ask for it by name

  const page = (file) => (_req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(PUBLIC, file));
  const roomPage = (file) => (req, res) => {
    if (!rooms.get(req.params.code)) return res.status(404).set('Cache-Control', 'no-cache').sendFile(path.join(PUBLIC, 'missing.html'));
    // Canonical uppercase code in the address bar.
    const code = normalizeCode(req.params.code);
    if (req.params.code !== code) return res.redirect(301, req.originalUrl.replace(req.params.code, code));
    return page(file)(req, res);
  };

  registerAuth(app, {
    store,
    clientId: auth.clientId,
    clientSecret: auth.clientSecret,
    baseUrl,
    ipOf: (req) => clientIp(req.headers, req.socket.remoteAddress, trustProxy),
    secureCookies: auth.secureCookies ?? publicUrl.startsWith('https://'),
    fetchImpl: auth.fetchImpl,
    devLogin: auth.devLogin === true,
    adminsOnly: !requireLogin,
  });

  app.get('/', page('home.html'));
  app.get('/dua-nhanh', page('quick.html')); // free quick race: runs entirely in the browser
  app.get('/kiem-chung', page('verify.html')); // re-run any race from its published seed
  app.get('/cong-bang', page('fair.html')); // how the provably fair algorithm works
  app.get('/dieu-khoan', page('terms.html'));
  app.get('/quyen-rieng-tu', page('privacy.html'));
  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/r/:code', roomPage('index.html'));
  app.get('/r/:code/host', roomPage('host.html'));
  app.get('/r/:code/live', roomPage('live.html')); // OBS browser source: race only, no controls
  app.get('/r/:code/qr.svg', async (req, res) => {
    const entry = rooms.get(req.params.code);
    if (!entry) return res.status(404).end();
    const playerUrl = `${publicBaseUrl(req.headers, { publicUrl, trustProxy })}/r/${entry.code}`;
    const svg = await QRCode.toString(playerUrl, { type: 'svg', margin: 1 });
    return res.type('image/svg+xml').set('Cache-Control', 'no-cache').send(svg);
  });

  app.post('/api/rooms', (req, res) => {
    const now = Date.now();
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'Yêu cầu không hợp lệ' });
    // Rooms are free to create (per-IP limits below); an operator can require sign-in instead.
    if (requireLogin && !req.user) return res.status(401).json({ error: 'Đăng nhập để tạo phòng', login: '/auth/google?returnTo=/' });
    const ip = clientIp(req.headers, req.socket.remoteAddress, trustProxy);
    if (!allowCreate(ip, now)) return res.status(429).json({ error: 'Tạo phòng nhanh quá, đợi một phút nhé' });
    const result = rooms.create({ ip, now, ownerId: req.user?.id ?? null });
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { code, hostKey } = result.entry;
    return res.status(201).json({ code, ...roomLinks(baseUrl(req), code, hostKey) });
  });

  app.get('/api/my-rooms', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    const base = baseUrl(req);
    res.set('Cache-Control', 'no-store').json({
      rooms: rooms.ownedBy(req.user.id).map((e) => ({
        code: e.code,
        title: e.room.title,
        phase: e.room.phase,
        players: e.room.players.size,
        playerUrl: `${base}/r/${e.code}`,
        hostUrl: `${base}/r/${e.code}/host`, // owners are recognised by their session, no key needed
      })),
    });
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, { serveClient: true, maxHttpBufferSize: 4096, allowRequest: sameOrigin });
  const startedAt = Date.now();

  // ---------- admin (role from ADMIN_EMAILS). Non-admins get a plain 404, not a hint. ----------
  const notFound = (res) => res.status(404).sendFile(path.join(PUBLIC, 'missing.html'));
  const adminOnly = (handler) => (req, res, next) => {
    if (req.user?.role !== 'admin') return notFound(res);
    if (req.method !== 'GET' && !isSameOrigin(req)) return res.status(403).json({ error: 'Yêu cầu không hợp lệ' });
    return handler(req, res, next);
  };
  app.get('/admin', adminOnly(page('admin.html')));
  app.get('/api/admin/overview', adminOnly((req, res) => {
    const now = Date.now();
    const roomList = rooms.list(now);
    const owners = new Map();
    roomList.forEach((r) => {
      if (r.ownerId && !owners.has(r.ownerId)) owners.set(r.ownerId, store.getUser(r.ownerId)?.email ?? null);
    });
    const users = store.listUsers({ query: req.query.q ?? '', limit: 100 }).map((u) => ({
      ...u,
      banned: Boolean(u.banned),
      liveRooms: rooms.ownedBy(u.id).length,
    }));
    res.set('Cache-Control', 'no-store').json({
      stats: {
        rooms: roomList.length,
        players: roomList.reduce((n, r) => n + r.players, 0),
        connections: roomList.reduce((n, r) => n + r.connections, 0),
        ...store.stats(now),
        uptimeMin: Math.round((now - startedAt) / 60000),
        memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      },
      rooms: roomList.map((r) => ({ ...r, ownerEmail: owners.get(r.ownerId) ?? null })),
      users,
    });
  }));
  app.post('/api/admin/rooms/:code/close', adminOnly((req, res) => {
    const entry = rooms.get(req.params.code);
    if (!entry) return res.status(404).json({ error: 'Không tìm thấy phòng' });
    closeRoom(io, rooms, entry.code);
    return res.json({ ok: true });
  }));
  // Check the admin before parsing the body: strangers' payloads are never even read.
  app.post('/api/admin/users/:id/ban', adminOnly((_req, _res, next) => next()), express.json({ limit: '1kb' }), adminOnly((req, res) => {
    const id = Number(req.params.id);
    const target = Number.isInteger(id) ? store.getUser(id) : null;
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Không thể tự khóa chính mình' });
    const banned = req.body?.banned === true;
    store.setBanned(target.id, banned);
    // Drop their live connections everywhere (a host seat in someone else's room included).
    if (banned) io.sockets.sockets.forEach((s) => s.data.userId === target.id && s.disconnect(true));
    // A banned host loses their live rooms immediately.
    const closed = banned ? rooms.ownedBy(target.id).map((e) => e.code).filter((code) => closeRoom(io, rooms, code)) : [];
    return res.json({ ok: true, banned, closedRooms: closed });
  }));

  app.use((_req, res) => notFound(res));
  const sockets = registerSockets(io, rooms, { buildId, trustProxy, publicUrl, maxSocketsPerIp, store });

  const ticker = setInterval(() => tickRooms(io, rooms, Date.now()), TICK_MS);
  const sweeper = setInterval(() => {
    sweepRooms(io, rooms, Date.now());
    store.purgeExpired(Date.now());
    allowCreate.prune(Date.now());
    sockets.prune(Date.now());
  }, SWEEP_MS);

  await new Promise((resolve) => httpServer.listen(port, '0.0.0.0', resolve));

  return {
    port: httpServer.address().port,
    rooms,
    io,
    store,
    close: () =>
      new Promise((resolve) => {
        clearInterval(ticker);
        clearInterval(sweeper);
        io.close(() => resolve());
      }),
  };
}
