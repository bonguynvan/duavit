import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../shared/catalog.js';
import { addBoatTap, balanceTeams, boatRate, createBoat, stepBoat } from '../shared/boat.js';
import { PHASES, Room } from '../src/game/room.js';
import { seededRng } from './helpers.js';

/** Tap every `everyMs` for the members given, ticking the room, until the race is over. */
function row(room, start, tappers) {
  let now = start;
  while (room.phase !== PHASES.FINISHED && now < start + 120000) {
    now += 50;
    for (const [id, everyMs] of tappers) if (now % everyMs === 0) room.tap(id, now);
    room.tick(now);
  }
  return now;
}

const boatRoom = () => {
  const room = new Room({ mode: 'boat', rng: seededRng(5) });
  const names = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà'];
  const players = names.map((n) => room.join(n, 'duck').player);
  return { room, players };
};

test('a boat rows at the average rate of its crew: one idle rower slows everyone', () => {
  const now = 10000;
  let busy = createBoat('a', [{ id: 'x' }, { id: 'y' }], 0);
  let lazy = createBoat('b', [{ id: 'x' }, { id: 'y' }], 0);
  for (let t = now - 900; t <= now; t += 100) {
    busy = addBoatTap(addBoatTap(busy, 'x', t), 'y', t);
    lazy = addBoatTap(lazy, 'x', t);
  }
  assert.ok(boatRate(busy, now) > 0);
  assert.equal(boatRate(lazy, now), boatRate(busy, now) / 2, 'half the crew rowing: half the rate');
  assert.equal(addBoatTap(busy, 'stranger', now), busy, 'only the crew can row');
  const fast = stepBoat({ ...busy, speed: 0 }, 0.05, 1000, now);
  const slow = stepBoat({ ...lazy, speed: 0 }, 0.05, 1000, now);
  assert.ok(fast.speed > slow.speed);
});

test('a big crew gains nothing for being big: same rate per rower, same speed', () => {
  const now = 5000;
  const crew = (n) => {
    let boat = createBoat('b', Array.from({ length: n }, (_, i) => ({ id: `m${i}` })), 0);
    for (let t = now - 900; t <= now; t += 125) for (let i = 0; i < n; i += 1) boat = addBoatTap(boat, `m${i}`, t);
    return boat;
  };
  assert.equal(boatRate(crew(2), now), boatRate(crew(7), now));
});

test('teams are spread evenly, new players join the smallest team, and the host can reshuffle', () => {
  const { room, players } = boatRoom();
  const sizes = (r) => [1, 2].map((n) => [...r.players.values()].filter((p) => p.team === n).length);
  assert.deepEqual(sizes(room), [3, 3]);
  assert.ok(room.setTeamCount(3).ok);
  const counts = [1, 2, 3].map((n) => [...room.players.values()].filter((p) => p.team === n).length);
  assert.ok(Math.max(...counts) <= 3 && counts.every((c) => c >= 1), `after 3 teams: ${counts}`);
  assert.ok(room.setTeamCount(7).error, 'at most 6 teams');
  assert.ok(room.shuffleTeams().ok);
  const shuffled = [1, 2, 3].map((n) => [...room.players.values()].filter((p) => p.team === n).length);
  assert.deepEqual(shuffled, [2, 2, 2]);
  assert.ok(room.setTeam(players[0].id, 1).player);
  assert.equal(room.players.get(players[0].id).team, 1);
  assert.ok(room.setTeam(players[0].id, 4).error, 'no team 4 with 3 teams');
  assert.deepEqual(balanceTeams(['a', 'b', 'c'], 2), new Map([['a', 1], ['b', 2], ['c', 1]]));
});

test('a boat race: taps row the right boat, the team that rows wins, results list the crews', () => {
  const { room, players } = boatRoom();
  assert.equal(room.mapId, 'song', 'boat races start on the river');
  assert.ok(room.start(0).ok);
  const snap = room.snapshot(0);
  assert.equal(snap.race.mode, 'boat');
  assert.equal(snap.race.teams.length, 2);
  assert.equal(snap.race.fairness, null, 'nothing hidden to prove: the crews decide it');
  assert.ok(snap.players.every((p) => p.inRace), 'every rower is in the race');
  const team1 = players.filter((p) => room.players.get(p.id).team === 1);
  const team2 = players.filter((p) => room.players.get(p.id).team === 2);
  // team 1 rows flat out, team 2 rows lazily
  row(room, 0, [...team1.map((p) => [p.id, 100]), ...team2.map((p) => [p.id, 400])]);
  assert.equal(room.phase, PHASES.FINISHED);
  const [first, second] = room.results;
  assert.equal(first.name, 'Đội 1');
  assert.equal(first.animal, 'thuyen');
  assert.deepEqual([...first.members].sort(), team1.map((p) => p.name).sort());
  assert.equal(second.name, 'Đội 2');
  assert.ok(first.timeMs < (second.timeMs ?? Infinity));
});

test('a boat race needs two teams with rowers; host-typed names cannot row', () => {
  const room = new Room({ mode: 'boat', rng: seededRng(1) });
  const a = room.join('An', 'duck').player;
  room.join('Bình', 'duck');
  room.setTeam(a.id, 2);
  room.players.forEach((p) => room.setTeam(p.id, 2));
  assert.ok(room.start(0).error, 'everyone on one team');
  room.addManual('Cô Lan', 'duck');
  assert.ok(room.start(0).error, 'a name without a phone does not make a crew');
  assert.ok(room.addBot().player);
  room.players.forEach((p) => { if (p.isBot) room.setTeam(p.id, 1); });
  assert.ok(room.start(0).ok, 'a bot crew counts');
});

test('pausing a boat race freezes it, leaving mid-race drops the rower, restart keeps the crews', () => {
  const { room, players } = boatRoom();
  room.start(0);
  room.tick(RULES.countdownMs + 50);
  for (let t = RULES.countdownMs; t < RULES.countdownMs + 1000; t += 100) players.forEach((p) => room.tap(p.id, t));
  room.tick(RULES.countdownMs + 1000);
  assert.ok(room.pauseRace(RULES.countdownMs + 1000).ok);
  const frozen = room.race.racers.map((b) => b.pos);
  room.tick(RULES.countdownMs + 5000);
  assert.deepEqual(room.race.racers.map((b) => b.pos), frozen);
  assert.ok(room.resumeRace(RULES.countdownMs + 9000).ok);
  room.remove(players[0].id);
  assert.ok(room.race.racers.every((b) => b.members.every((m) => m.id !== players[0].id)));
  assert.ok(room.restartRace(RULES.countdownMs + 9100).ok);
  assert.equal(room.race.mode, 'boat');
  assert.equal(room.race.racers.reduce((n, b) => n + b.members.length, 0), players.length - 1);
});

test('teams balance the rowers only; nobody changes team mid-race; frames stay small', () => {
  const room = new Room({ mode: 'boat', rng: seededRng(9) });
  const rowers = ['An', 'Bình', 'Châu', 'Dũng'].map((n) => room.join(n, 'duck').player);
  room.join('Xem thôi', 'duck', { spectator: true });
  room.addManual('Cô Lan', 'duck');
  const rowersIn = (n) => rowers.filter((p) => room.players.get(p.id).team === n).length;
  assert.deepEqual([rowersIn(1), rowersIn(2)], [2, 2], 'spectators and typed-in names do not count for the balance');
  room.setTeamCount(2);
  assert.deepEqual([rowersIn(1), rowersIn(2)], [2, 2]);
  assert.ok(room.start(0).ok);
  assert.ok(room.setTeam(rowers[0].id, 2).error, 'no team change in the middle of a race');
  const frame = room.snapshot(0).race;
  assert.ok(frame.racers.every((b) => !('members' in b) && !('rowers' in b)), 'no per-rower lists in the 20 Hz frames');
  assert.ok(frame.teams.every((t) => !('members' in t)));
});

test('restart in a boat race brings in everyone who can row now', () => {
  const { room } = boatRoom();
  room.start(0);
  room.abortRace();
  room.start(10);
  const late = room.join('Mới vào', 'duck').player;
  assert.ok(room.restartRace(20).ok);
  assert.ok(room.snapshot(20).players.find((p) => p.id === late.id).inRace, 'the latecomer rows in the restarted race');
});
