import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Room } from '../game/room.js';
import { Chat } from '../chat.js';

// No 0/O, 1/I/L: codes get read aloud on livestreams and typed on phones.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export const ROOM_DEFAULTS = Object.freeze({
  maxRooms: 500,
  maxRoomsPerIp: 3,
  maxRoomsPerUser: 3,
  idleMs: 30 * 60 * 1000, // empty rooms are closed after this long
});

/** Normalise user-typed codes ("k7qx2a" -> "K7QX2A"); null when it can't be a valid code. */
export function normalizeCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

function newCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/**
 * @typedef {{
 *   code: string, hostKey: string, room: Room, chat: Chat, ownerIp: string,
 *   createdAt: number, lastActiveAt: number, connections: number,
 *   dirty: boolean, lastRosterKey: string,
 * }} RoomEntry
 */

/** Owns every live room: creation limits, lookup, host keys and idle clean-up. */
export class RoomManager {
  /** @param {Partial<typeof ROOM_DEFAULTS> & { createRoom?: () => Room }} [opts] */
  constructor(opts = {}) {
    this.limits = { ...ROOM_DEFAULTS, ...opts };
    this.createRoom = opts.createRoom ?? (() => new Room());
    /** @type {Map<string, RoomEntry>} */
    this.rooms = new Map();
  }

  get size() {
    return this.rooms.size;
  }

  /**
   * @param {{ ip: string, now: number, ownerId?: number | null }} opts  signed-in creators are limited per account
   * @returns {{ entry: RoomEntry } | { error: string, status: number }}
   */
  create({ ip, now, ownerId = null }) {
    if (this.rooms.size >= this.limits.maxRooms) return { error: 'Máy chủ đang quá tải, thử lại sau ít phút', status: 503 };
    const mine = [...this.rooms.values()].filter((e) => (ownerId ? e.ownerId === ownerId : e.ownerIp === ip)).length;
    const limit = ownerId ? this.limits.maxRoomsPerUser : this.limits.maxRoomsPerIp;
    if (mine >= limit) {
      return { error: `Mỗi ${ownerId ? 'tài khoản' : 'thiết bị'} mở tối đa ${limit} phòng cùng lúc`, status: 429 };
    }
    let code = newCode();
    while (this.rooms.has(code)) code = newCode();
    const entry = {
      code,
      hostKey: randomBytes(16).toString('hex'),
      room: this.createRoom(),
      chat: new Chat(),
      ownerIp: ip,
      ownerId,
      createdAt: now,
      lastActiveAt: now,
      connections: 0,
      dirty: false,
      lastRosterKey: '',
    };
    this.rooms.set(code, entry);
    return { entry };
  }

  /** @returns {RoomEntry | null} */
  get(rawCode) {
    const code = normalizeCode(rawCode);
    return code ? this.rooms.get(code) ?? null : null;
  }

  isHostKey(entry, given) {
    if (typeof given !== 'string') return false;
    const a = Buffer.from(given);
    const b = Buffer.from(entry.hostKey);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  connect(entry, now) {
    entry.connections += 1;
    entry.lastActiveAt = now;
  }

  disconnect(entry, now) {
    entry.connections = Math.max(0, entry.connections - 1);
    entry.lastActiveAt = now;
  }

  touch(entry, now) {
    entry.lastActiveAt = now;
  }

  close(code) {
    return this.rooms.delete(code);
  }

  /** Close rooms nobody has been connected to for `idleMs`. Returns the closed codes. */
  sweep(now) {
    const closed = [];
    for (const entry of this.rooms.values()) {
      const idle = entry.connections === 0 && now - entry.lastActiveAt >= this.limits.idleMs;
      if (idle) closed.push(entry.code);
    }
    closed.forEach((code) => this.rooms.delete(code));
    return closed;
  }

  /** Live rooms owned by a user ("Phòng của tôi"). */
  ownedBy(userId) {
    return [...this.rooms.values()].filter((e) => userId && e.ownerId === userId);
  }

  /** Overview for the admin page (no secrets). */
  list(now) {
    return [...this.rooms.values()].map((e) => ({
      code: e.code,
      ownerId: e.ownerId,
      title: e.room.title,
      phase: e.room.phase,
      players: e.room.players.size,
      connections: e.connections,
      ageMin: Math.round((now - e.createdAt) / 60000),
      idleMin: Math.round((now - e.lastActiveAt) / 60000),
    }));
  }
}
