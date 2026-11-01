// "Đua thuyền": team races. Each team rows one boat; its speed follows the AVERAGE tap rate of all its
// members, so a member who stops rowing slows the whole boat down and a big team gains nothing just for
// being big. Taps are capped per member exactly like a tap race (shared/tap.js). No hidden randomness.
import { RULES } from './catalog.js';
import { TAP_TOP_SPEED, addTap, tapRate } from './tap.js';

export const BOAT_TEAM_COLORS = ['#e63946', '#2d9cdb', '#f2b705', '#2a9d8f', '#9b5de5', '#f3722c'];
export const MIN_TEAMS = 2;
export const MAX_TEAMS = BOAT_TEAM_COLORS.length;

export const teamId = (n) => `team-${n}`;
export const teamName = (n) => `Đội ${n}`;

/** @param {{ id: string, botRate: number | null }[]} members */
export function createBoat(id, members, now) {
  return {
    id,
    pos: 0,
    speed: 0,
    event: null,
    finishedAt: null,
    startedAt: now,
    members: members.map((m) => ({ id: m.id, taps: [], botRate: m.botRate ?? null, startedAt: now, finishedAt: null })),
  };
}

/** A tap from one member's phone. Returns the boat unchanged when it did not count. */
export function addBoatTap(boat, memberId, now) {
  if (boat.finishedAt !== null) return boat;
  const index = boat.members.findIndex((m) => m.id === memberId);
  if (index < 0) return boat;
  const before = boat.members[index];
  const after = addTap(before, now);
  if (after === before) return boat;
  return { ...boat, members: boat.members.map((m, i) => (i === index ? after : m)) };
}

/** Taps a second per member; the boat's rate is their average (idle members count as zero). */
export const memberRates = (boat, now) => boat.members.map((m) => tapRate(m, now));
export function boatRate(boat, now) {
  const rates = memberRates(boat, now);
  return rates.length === 0 ? 0 : rates.reduce((a, b) => a + b, 0) / rates.length;
}

/** One fixed physics step; `now` is the time at the end of the step (ms). */
export function stepBoat(boat, dtSec, trackLength, now) {
  if (boat.finishedAt !== null) return boat;
  const rate = boatRate(boat, now);
  const target = TAP_TOP_SPEED * Math.min(1, rate / RULES.tapFullRate);
  const speed = boat.speed + (target - boat.speed) * Math.min(1, RULES.tapAccel * dtSec);
  const event = rate >= RULES.tapFullRate ? 'burst' : null;
  const members = boat.members.map((m) => (m.taps.length > 0 && now - m.taps[0] >= RULES.tapWindowMs
    ? { ...m, taps: m.taps.filter((t) => now - t < RULES.tapWindowMs) } : m));
  const pos = boat.pos + speed * dtSec;
  if (pos < trackLength) return { ...boat, speed, pos, event, members };
  const overshootSec = speed > 0 ? (pos - trackLength) / speed : 0;
  return { ...boat, speed, pos: trackLength, event: null, members, finishedAt: now - overshootSec * 1000 };
}

/** Shift every timestamp after a pause, so the pause does not count. */
export const shiftBoat = (boat, ms) => ({
  ...boat,
  startedAt: boat.startedAt + ms,
  finishedAt: boat.finishedAt === null ? null : boat.finishedAt + ms,
  members: boat.members.map((m) => ({ ...m, taps: m.taps.map((t) => t + ms), startedAt: m.startedAt + ms })),
});

/**
 * Spread players over `count` teams as evenly as possible. `order` decides who goes where:
 * the join order by default, a shuffled order when the host asks for random teams.
 * @returns {Map<string, number>} player id -> team number (1..count)
 */
export function balanceTeams(ids, count) {
  const n = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, Math.floor(count) || MIN_TEAMS));
  return new Map(ids.map((id, i) => [id, (i % n) + 1]));
}
