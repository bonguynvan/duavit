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
  unclaimedMs: 10 * 60 * 1000, // rooms whose host never opened the host screen (anyone can create rooms)
  maxAgeMs: 12 * 60 * 60 * 1000, // nothing can hold a room forever; a long event still fits
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
 *   createdAt: number, claimedAt: number | null, lastActiveAt: number, connections: number,
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
   * @param {{ ip: string, now: number, ownerId?: number | null }} opts  limited per IP, and signed-in creators per account too
   * @returns {{ entry: RoomEntry } | { error: string, status: number }}
   */
  create({ ip, now, ownerId = null }) {
    if (this.rooms.size >= this.limits.maxRooms) return { error: 'Máy chủ đang quá tải, thử lại sau ít phút', status: 503 };
    const live = [...this.rooms.values()];
    const { maxRoomsPerIp, maxRoomsPerUser } = this.limits;
    if (live.filter((e) => e.ownerIp === ip).length >= maxRoomsPerIp) {
      return { error: `Mỗi thiết bị mở tối đa ${maxRoomsPerIp} phòng cùng lúc`, status: 429 };
    }
    if (ownerId && live.filter((e) => e.ownerId === ownerId).length >= maxRoomsPerUser) {
      return { error: `Mỗi tài khoản mở tối đa ${maxRoomsPerUser} phòng cùng lúc`, status: 429 };
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
      claimedAt: null, // when a host first authenticated
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

  /** A host opened the host screen: the room is in real use. */
  claim(entry, now) {
    entry.claimedAt ??= now;
  }

  close(code) {
    return this.rooms.delete(code);
  }

  /**
   * Close rooms nobody has been connected to for `idleMs`, rooms no host opened within
   * `unclaimedMs` (connected sockets can't keep those alive), and any room older than `maxAgeMs`.
   * Returns the closed codes.
   */
  sweep(now) {
    const { idleMs, unclaimedMs, maxAgeMs } = this.limits;
    const closed = [];
    for (const entry of this.rooms.values()) {
      const idle = entry.connections === 0 && now - entry.lastActiveAt >= idleMs;
      const unclaimed = entry.claimedAt === null && now - entry.createdAt >= unclaimedMs;
      const expired = now - entry.createdAt >= maxAgeMs;
      if (idle || unclaimed || expired) closed.push(entry.code);
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
