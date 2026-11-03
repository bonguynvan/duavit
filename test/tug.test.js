import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../shared/catalog.js';
import { TUG, restingRope, ropeWinner, stepRope } from '../shared/tug.js';
import { PHASES, Room } from '../src/game/room.js';
import { seededRng } from './helpers.js';

/** Tap every `everyMs` for the players given, ticking the room, until the pull is over. */
function pull(room, start, tappers) {
  let now = start;
  while (room.phase !== PHASES.FINISHED && now < start + 120000) {
    now += 50;
    for (const [id, everyMs] of tappers) if (now % everyMs === 0) room.tap(id, now);
    room.tick(now);
  }
  return now;
}

const tugRoom = (names = ['An', 'Bình', 'Châu', 'Dũng']) => {
  const room = new Room({ mode: 'tug', rng: seededRng(7) });
  const players = names.map((n) => room.join(n, 'duck').player);
  const side = (n) => players.filter((p) => room.players.get(p.id).team === n);
  return { room, players, side };
};

test('the rope drifts toward the team pulling harder and stops at the winning line', () => {
  let rope = restingRope();
  for (let k = 0; k < 40; k += 1) rope = stepRope(rope, RULES.tapFullRate, 0, 0.05);
  assert.ok(rope.pos < 0, 'team 1 (left) pulls it left');
  let even = restingRope();
  for (let k = 0; k < 400; k += 1) even = stepRope(even, 6, 6, 0.05);
  assert.equal(even.pos, 0, 'equal pulls: nobody moves');
  let won = restingRope();
  for (let k = 0; k < 4000; k += 1) won = stepRope(won, 0, RULES.tapFullRate, 0.05);
  assert.equal(won.pos, TUG.winAt);
  assert.equal(ropeWinner(won), 1);
  assert.equal(ropeWinner({ pos: 0.01, vel: 0 }, true), null, 'a mark at the middle at the time limit is a draw');
  assert.equal(ropeWinner({ pos: -0.3, vel: 0 }, true), 0);
});

test('tug of war always has two teams', () => {
  const room = new Room({ mode: 'boat', rng: seededRng(2) });
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((n) => room.join(n, 'duck'));
  room.setTeamCount(3);
  assert.ok(room.setMode('tug').ok);
  assert.equal(room.teamCount, 2);
  assert.ok([...room.players.values()].every((p) => p.team === 1 || p.team === 2));
  assert.ok(room.setTeamCount(3).error);
});

test('the team that pulls harder wins; results name both crews; the rope is in the frames', () => {
  const { room, side } = tugRoom();
  assert.ok(room.start(0).ok);
  const frame = room.snapshot(0).race;
  assert.equal(frame.mode, 'tug');
  assert.deepEqual(frame.rope, { pos: 0, vel: 0 });
  assert.equal(frame.fairness, null);
  pull(room, 0, [...side(1).map((p) => [p.id, 400]), ...side(2).map((p) => [p.id, 100])]);
  assert.equal(room.phase, PHASES.FINISHED);
  const [first, second] = room.results;
  assert.equal(first.name, 'Đội 2');
  assert.equal(first.rank, 1);
  assert.equal(second.rank, 2);
  assert.ok(first.timeMs > 0 && first.timeMs < TUG.maxMs, 'won before the time limit');
  assert.equal(first.animal, 'keoCo');
  assert.deepEqual([...first.members].sort(), side(2).map((p) => p.name).sort());
});

test('nobody pulling: a draw at the time limit', () => {
  const { room } = tugRoom();
  room.start(0);
  const end = pull(room, 0, []);
  assert.ok(end >= RULES.countdownMs + TUG.maxMs);
  assert.ok(room.results.every((r) => r.draw && r.rank === 1 && r.timeMs === null));
});

test('a team that leaves the rope hands the win to the other', () => {
  const { room, side } = tugRoom();
  room.start(0);
  room.tick(RULES.countdownMs + 50);
  side(1).forEach((p) => room.remove(p.id));
  room.tick(RULES.countdownMs + 100);
  assert.equal(room.phase, PHASES.FINISHED);
  assert.equal(room.results.length, 1);
  assert.equal(room.results[0].name, 'Đội 2');
});
