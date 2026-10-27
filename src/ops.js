// Operator API for the peti.vn admin dashboard (machine to machine, never for browsers).
// Disabled unless OPS_TOKEN (32+ characters) is set; every call needs "Authorization: Bearer <OPS_TOKEN>".
// The public proxy also refuses /api/ops/* (deploy/edge/duavit.caddy): reachable only from the server itself.
import { createHash, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { findMap } from '../shared/catalog.js';

export const OPS_TOKEN_MIN = 32;
const STATS_DAYS = 30;
const digest = (value) => createHash('sha256').update(String(value)).digest();

export const isOpsToken = (token) => typeof token === 'string' && token.length >= OPS_TOKEN_MIN;

/**
 * @param {import('express').Express} app
 * @param {{ token: string, game: { id: string, name: string, url: string }, rooms: object, closeRoom: (code: string) => boolean,
 *           stats: import('./stats.js').DailyStats, settings: import('./settings.js').Settings,
 *           onSettings: (settings: object) => void, startedAt: number }} opts
 */
export function registerOps(app, { token, game, rooms, closeRoom, stats, settings, onSettings, startedAt }) {
  if (!isOpsToken(token)) return;
  const expected = digest(`Bearer ${token}`);
  const authorized = (req) => timingSafeEqual(digest(req.headers.authorization ?? ''), expected);
  const guard = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    return authorized(req) ? next() : res.status(401).json({ error: 'Sai OPS_TOKEN' });
  };

  app.get('/api/ops/overview', guard, (_req, res) => {
    const now = Date.now();
    const list = rooms.list(now);
    res.json({
      game,
      now,
      uptimeMin: Math.round((now - startedAt) / 60000),
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      live: {
        rooms: list.length,
        players: list.reduce((n, r) => n + r.players, 0),
        connections: list.reduce((n, r) => n + r.connections, 0),
      },
      rooms: list.map(({ ownerId: _owner, ...r }) => ({ ...r, mapName: findMap(r.mapId)?.name ?? r.mapId })),
      daily: stats.recent(STATS_DAYS, now),
      settings: settings.get(),
    });
  });

  app.post('/api/ops/rooms/:code/close', guard, (req, res) => {
    if (!closeRoom(String(req.params.code))) return res.status(404).json({ error: 'Không tìm thấy phòng' });
    return res.json({ ok: true });
  });

  // Token first, body second: strangers' payloads are never parsed.
  app.post('/api/ops/settings', guard, express.json({ limit: '2kb' }), (req, res) => {
    const result = settings.update(req.body ?? {});
    if (result.error) return res.status(400).json({ error: result.error });
    onSettings(result.settings);
    return res.json(result);
  });
}
