// Đua nhanh "fun mode": random accessories and racers throwing things at each other.
// Purely visual: this uses Math.random, never the race seed, and never touches positions,
// so the result is exactly what the seed decided and stays verifiable.
// (Relative import so the Node tests resolve it; in the browser it is /shared/catalog.js.)
import { ITEMS, RULES } from '../../../shared/catalog.js';

const THROWABLES = ITEMS.filter((i) => i.throwable).map((i) => i.id);
const DECOR = ITEMS.filter((i) => !i.throwable).map((i) => i.id);
const THROWABLE_SHARE = 0.6; // most racers carry something to throw, not all
const SECOND_DECOR_SHARE = 0.35;

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

/** 1–3 free accessories for one racer. @param {() => number} rand */
export function randomItems(rand) {
  const first = pick(DECOR, rand);
  const items = [first];
  if (rand() < SECOND_DECOR_SHARE) items.push(pick(DECOR.filter((id) => id !== first), rand));
  if (rand() < THROWABLE_SHARE) items.push(pick(THROWABLES, rand));
  return items.slice(0, RULES.maxItems);
}

/**
 * Pick the next throw: a running racer with something throwable aims at the nearest racer
 * ahead (the leader throws back at anyone). Finished racers neither throw nor get hit.
 * @param {{ id: string, pos: number, finishedAt: number | null }[]} racers
 * @param {{ id: string, items: string[] }[]} players
 * @param {() => number} rand
 */
export function pickThrow(racers, players, rand) {
  const running = racers.filter((r) => r.finishedAt === null);
  if (running.length < 2) return null;
  const throwablesOf = new Map(players.map((p) => [p.id, p.items.filter((id) => THROWABLES.includes(id))]));
  const throwers = running.filter((r) => throwablesOf.get(r.id)?.length);
  if (throwers.length === 0) return null;
  const from = pick(throwers, rand);
  const others = running.filter((r) => r.id !== from.id);
  const ahead = others.filter((r) => r.pos >= from.pos).sort((a, b) => a.pos - b.pos);
  const to = ahead[0] ?? pick(others, rand);
  return { type: 'throw', item: pick(throwablesOf.get(from.id), rand), from: from.id, to: to.id };
}
