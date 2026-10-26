import QRCode from 'qrcode';
import { initialsOf } from '../shared/catalog.js';
import { HOST_AUTHOR } from './chat.js';
import { parseCookies } from './auth/cookies.js';
import { SESSION_COOKIE } from './auth/routes.js';

const MAX_EVENTS_PER_SEC = 20; // per socket; real clients send a handful per minute
const AUTH_MAX_FAILURES = 5;
const AUTH_LOCKOUT_MS = 60000;
const JOINS_PER_MINUTE = 10; // join/resume/leave per socket: each one sends a full snapshot

const asObject = (v) => (v && typeof v === 'object' ? v : {});
const asCallback = (fn) => (typeof fn === 'function' ? fn : () => {});

/** Client IP; behind our own reverse proxy (Caddy) the real one is in X-Forwarded-For. */
export function clientIp(headers, remoteAddress, trustProxy) {
  const forwarded = trustProxy ? String(headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '';
  return forwarded || remoteAddress || 'unknown';
}

/** Base URL players should open (QR code / share links). */
export function publicBaseUrl(headers, { publicUrl, trustProxy }) {
  if (publicUrl) return publicUrl.replace(/\/+$/, '');
  const proto = trustProxy && headers['x-forwarded-proto'] ? String(headers['x-forwarded-proto']).split(',')[0] : 'http';
  return `${proto}://${headers.host ?? 'localhost'}`;
}

export const roomLinks = (base, code, hostKey) => ({
  playerUrl: `${base}/r/${code}`,
  hostUrl: `${base}/r/${code}/host?key=${hostKey}`,
  liveUrl: `${base}/r/${code}/live`,
});

/** Sockets currently in a room (Socket.IO keeps the membership for us). */
function socketsIn(io, code) {
  const ids = io.sockets.adapter.rooms.get(code) ?? new Set();
  return [...ids].map((id) => io.sockets.sockets.get(id)).filter(Boolean);
}

/**
 * Wire every socket event. Each socket belongs to exactly one room, chosen by the
 * `room` query parameter on connect; nothing ever crosses between rooms.
 */
export function registerSockets(io, rooms, { buildId, trustProxy, publicUrl, maxSocketsPerIp, store }) {
  const socketsPerIp = new Map();
  const authFailures = new Map(); // "ip|room" -> { count, lockedUntil }

  io.use((socket, next) => {
    const entry = rooms.get(socket.handshake.query.room);
    if (!entry) return next(new Error('ROOM_NOT_FOUND'));
    const ip = clientIp(socket.handshake.headers, socket.handshake.address, trustProxy);
    const count = socketsPerIp.get(ip) ?? 0;
    if (count >= maxSocketsPerIp) return next(new Error('TOO_MANY_CONNECTIONS'));
    socketsPerIp.set(ip, count + 1);
    socket.data.ip = ip;
    socket.data.code = entry.code;
    // Signed-in user (if any) from the session cookie sent with the handshake.
    const user = store?.userForToken(parseCookies(socket.handshake.headers.cookie)[SESSION_COOKIE], Date.now());
    socket.data.userId = user?.id ?? null;
    socket.data.isAdmin = user?.role === 'admin';
    socket.once('disconnect', () => {
      const left = (socketsPerIp.get(ip) ?? 1) - 1;
      if (left <= 0) socketsPerIp.delete(ip);
      else socketsPerIp.set(ip, left);
    });
    next();
  });

  io.on('connection', (socket) => {
    const code = socket.data.code;
    const entry = rooms.get(code);
    if (!entry) return socket.disconnect(true); // closed in between
    const { room, chat } = entry;
    socket.join(code);
    rooms.connect(entry, Date.now());

    const toRoom = () => io.to(code);
    // State changes are coalesced and pushed once per tick, so event floods can't amplify traffic.
    const broadcast = () => {
      entry.dirty = true;
      rooms.touch(entry, Date.now());
    };

    socket.emit('hello', { build: buildId, code });
    socket.emit('state', room.snapshot(Date.now()));
    socket.emit('chat:history', chat.history());

    let windowStart = 0;
    let windowCount = 0;
    socket.use((packet, next) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        windowCount = 0;
      }
      windowCount += 1;
      if (windowCount <= MAX_EVENTS_PER_SEC) return next();
      const ack = packet[packet.length - 1];
      if (typeof ack === 'function') ack({ error: 'Chậm lại chút nhé' }); // dropped, but tell the client
    });

    /** Send fresh state to this socket right away (before its ack) and to everyone on the next tick. */
    const pushStateFirst = () => {
      socket.emit('state', room.snapshot(Date.now()));
      broadcast();
    };

    // Join/leave churn costs a full snapshot each time; real players do it a few times at most.
    let joinTimes = [];
    const joinAllowed = () => {
      const now = Date.now();
      joinTimes = [...joinTimes.filter((t) => now - t < 60000), now];
      return joinTimes.length <= JOINS_PER_MINUTE;
    };

    const bindPlayer = (player) => {
      socket.data.playerId = player.id;
      return { ok: true, playerId: player.id, token: player.token };
    };

    socket.on('player:join', (data, cb) => {
      const reply = asCallback(cb);
      const existing = room.players.get(socket.data.playerId);
      if (existing) return reply(bindPlayer(existing)); // lost ack on a previous attempt: hand the same identity back
      if (!joinAllowed()) return reply({ error: 'Vào ra nhiều quá, đợi một phút nhé' });
      const { name, animal, spectator } = asObject(data);
      const result = room.join(name, animal, { spectator: spectator === true });
      if (result.error) return reply(result);
      const ack = bindPlayer(result.player);
      pushStateFirst(); // the client must already see itself when the ack lands
      reply(ack);
    });

    socket.on('player:resume', (data, cb) => {
      if (!joinAllowed()) return asCallback(cb)({ error: 'Vào ra nhiều quá, đợi một phút nhé' });
      const player = room.resume(asObject(data).token);
      if (!player) return asCallback(cb)({ error: 'Phiên đã hết hạn', expired: true });
      const ack = bindPlayer(player);
      pushStateFirst();
      asCallback(cb)(ack);
    });

    const playerAction = (event, action) => {
      socket.on(event, (data, cb) => {
        const result = action(asObject(data));
        asCallback(cb)(result.error ? result : { ok: true });
        if (!result.error) broadcast();
      });
    };
    playerAction('player:animal', ({ animal }) => room.setAnimal(socket.data.playerId, animal));
    playerAction('player:spectator', ({ spectator }) => room.setSpectator(socket.data.playerId, spectator === true));
    playerAction('player:items', ({ items }) => room.setItems(socket.data.playerId, items));

    const effect = (event, action) => {
      socket.on(event, (data, cb) => {
        const result = action(asObject(data));
        if (result.error) return asCallback(cb)(result);
        toRoom().emit('fx', result.fx);
        asCallback(cb)({ ok: true });
      });
    };
    effect('race:throw', ({ item }) => room.throwItem(socket.data.playerId, item, Date.now()));
    effect('race:react', ({ emoji }) => room.react(socket.data.playerId, emoji, Date.now()));

    socket.on('player:leave', (data, cb) => {
      if (socket.data.playerId) room.remove(socket.data.playerId);
      socket.data.playerId = null;
      asCallback(typeof data === 'function' ? data : cb)({ ok: true });
      broadcast();
    });

    socket.on('host:auth', async (data, cb) => {
      const reply = asCallback(cb);
      // Per IP *and* room: a stranger on the same event Wi-Fi can't lock the real host out of theirs.
      const failKey = `${socket.data.ip}|${code}`;
      const failures = authFailures.get(failKey) ?? { count: 0, lockedUntil: 0 };
      if (Date.now() < failures.lockedUntil) return reply({ error: 'Thử sai quá nhiều, đợi 1 phút' });
      const isOwner = socket.data.userId !== null && entry.ownerId === socket.data.userId;
      // Admins may take over any room to moderate it.
      if (!isOwner && !socket.data.isAdmin && !rooms.isHostKey(entry, asObject(data).key)) {
        const count = failures.count + 1;
        authFailures.set(failKey, count >= AUTH_MAX_FAILURES ? { count: 0, lockedUntil: Date.now() + AUTH_LOCKOUT_MS } : { count, lockedUntil: 0 });
        return reply({ error: 'Sai link host' });
      }
      authFailures.delete(failKey);
      socket.data.isHost = true;
      const links = roomLinks(publicBaseUrl(socket.handshake.headers, { publicUrl, trustProxy }), code, entry.hostKey);
      let qr = null;
      try {
        qr = await QRCode.toDataURL(links.playerUrl, { margin: 1, width: 360 });
      } catch {
        // QR is a convenience; the link still works without it
      }
      reply({ ok: true, code, joinUrl: links.playerUrl, liveUrl: links.liveUrl, qr });
    });

    // Players chat as themselves; the host (if not also a player) chats as "Host".
    socket.on('chat:send', (data, cb) => {
      const reply = asCallback(cb);
      const player = room.players.get(socket.data.playerId);
      const author = player ?? (socket.data.isHost ? HOST_AUTHOR : null);
      if (!author) return reply({ error: 'Vào phòng rồi mới chat được' });
      const result = chat.post({ ...author, initials: author.initials ?? initialsOf(author.name) }, asObject(data).text, Date.now());
      if (result.error) return reply(result);
      toRoom().emit('chat:message', result.message);
      reply({ ok: true });
    });

    const hostAction = (event, action) => {
      socket.on(event, (data, cb) => {
        const reply = asCallback(typeof data === 'function' ? data : cb);
        if (!socket.data.isHost) return reply({ error: 'Chỉ host mới làm được' });
        const result = action(asObject(data));
        reply(result.error ? result : { ok: true });
        if (!result.error) broadcast();
      });
    };
    const notifyPlayer = (playerId, fn) => socketsIn(io, code).filter((s) => s.data.playerId === playerId).forEach(fn);

    hostAction('host:map', ({ mapId }) => room.setMap(mapId));
    hostAction('host:duration', ({ seconds }) => room.setDuration(seconds ?? null));
    hostAction('host:specialMaps', ({ allowed }) => room.setSpecialMaps(allowed === true));
    hostAction('host:start', () => room.start(Date.now()));
    hostAction('host:lobby', () => room.backToLobby());
    hostAction('host:pause', () => room.pauseRace(Date.now()));
    hostAction('host:resume', () => room.resumeRace(Date.now()));
    hostAction('host:restart', () => room.restartRace(Date.now()));
    hostAction('host:abort', () => room.abortRace());
    hostAction('host:addPlayer', ({ name, animal }) => room.addManual(name, animal));
    hostAction('host:title', ({ title }) => room.setTitle(title));
    hostAction('host:spectator', ({ id, spectator }) => {
      const result = room.setSpectator(id, spectator === true);
      if (result.error) return result;
      notifyPlayer(id, (s) => s.emit('moved', { spectator: spectator === true }));
      return { ok: true };
    });
    hostAction('host:kick', ({ id }) => {
      if (!room.remove(id)) return { error: 'Không tìm thấy người chơi' };
      notifyPlayer(id, (s) => {
        s.data.playerId = null;
        s.emit('kicked');
      });
      return { ok: true };
    });

    socket.on('disconnect', () => {
      rooms.disconnect(entry, Date.now());
      if (!socket.data.playerId) return;
      const stillConnected = socketsIn(io, code).some((s) => s !== socket && s.data.playerId === socket.data.playerId);
      if (!stillConnected && room.disconnect(socket.data.playerId, Date.now())) broadcast();
    });
  });

  return {
    /** Forget expired lockouts so the map can't grow forever. */
    prune(now) {
      for (const [key, f] of authFailures) if (f.lockedUntil < now) authFailures.delete(key);
    },
  };
}

/**
 * One tick for every room: advance the race and push state. Full state only when the
 * roster changed; otherwise a small 'race' frame keeps 20 Hz traffic flat.
 */
export function tickRooms(io, rooms, now) {
  for (const entry of rooms.rooms.values()) {
    const changed = entry.room.tick(now);
    if (!changed && !entry.dirty) continue;
    entry.dirty = false;
    const snap = entry.room.snapshot(now);
    const rosterKey = JSON.stringify([snap.players, snap.title, snap.mapId, snap.durationSec, snap.allowSpecialMaps]);
    if (rosterKey !== entry.lastRosterKey || !snap.race) {
      entry.lastRosterKey = rosterKey;
      io.to(entry.code).emit('state', snap);
    } else {
      io.to(entry.code).emit('race', { phase: snap.phase, serverNow: snap.serverNow, race: snap.race, results: snap.results });
    }
  }
}

/** Close one room now: tell everyone, then disconnect them. */
export function closeRoom(io, rooms, code) {
  const sockets = socketsIn(io, code);
  if (!rooms.close(code)) return false;
  sockets.forEach((s) => {
    s.emit('room:closed');
    s.disconnect(true);
  });
  return true;
}

/** Close idle rooms and kick any straggler sockets out of them. */
export function sweepRooms(io, rooms, now) {
  const closed = rooms.sweep(now);
  closed.forEach((code) => socketsIn(io, code).forEach((s) => s.disconnect(true)));
  return closed;
}
