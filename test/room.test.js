import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, initialsOf, randomForm } from '../shared/catalog.js';
import { PHASES, Room, sanitizeName } from '../src/game/room.js';
import { seededRng } from './helpers.js';

const runUntilFinished = (room, start = 0) => {
  let now = start;
  while (room.phase !== PHASES.FINISHED && now < start + 200000) {
    now += 50;
    room.tick(now);
  }
  return now;
};

const twoPlayers = () => {
  const room = new Room({ rng: seededRng(3) });
  const a = room.join('An', 'turtle').player;
  const b = room.join('Bình', 'rabbit').player;
  return { room, a, b };
};

test('sanitizeName trims, collapses spaces and strips control characters', () => {
  assert.equal(sanitizeName('  Minh   Anh \u0007'), 'Minh Anh');
  assert.equal(sanitizeName('a\u202eb'), 'ab');
  assert.equal(sanitizeName('   '), null);
  assert.equal(sanitizeName('\u3164\u2060\ufeff'), null, 'invisible-only names are rejected');
  assert.equal(sanitizeName('...'), null, 'needs at least one letter or digit');
  assert.equal(sanitizeName(42), null);
  assert.equal(sanitizeName('x'.repeat(RULES.nameMaxLength + 1)), null);
  assert.equal(sanitizeName('Ố'.repeat(RULES.nameMaxLength)), 'Ố'.repeat(RULES.nameMaxLength));
});

test('initialsOf uses first and last word', () => {
  assert.equal(initialsOf('nguyễn văn an'), 'NA');
  assert.equal(initialsOf('Ân'), 'Â');
  assert.equal(initialsOf(''), '?');
});

test('randomForm stays within the configured spread', () => {
  assert.equal(randomForm(() => 0), 1 - RULES.formSpread);
  assert.equal(randomForm(() => 0.5), 1);
});

test('join validates name, animal and capacity', () => {
  const room = new Room();
  assert.ok(room.join('', 'cat').error);
  assert.ok(room.join('An', 'unicorn').error);
  for (let i = 0; i < RULES.maxPlayers; i += 1) assert.ok(room.join(`P${i}`, 'cat').player);
  assert.match(room.join('Late', 'cat').error, /đầy/);
});

test('snapshot never leaks player tokens', () => {
  const { room } = twoPlayers();
  const json = JSON.stringify(room.snapshot(0));
  for (const p of room.players.values()) assert.ok(!json.includes(p.token));
});

test('resume restores a disconnected player by token', () => {
  const { room, a } = twoPlayers();
  room.disconnect(a.id, 0);
  assert.equal(room.players.get(a.id).connected, false);
  assert.equal(room.resume(a.token).id, a.id);
  assert.equal(room.players.get(a.id).connected, true);
  assert.equal(room.resume('nope'), null);
  assert.equal(room.resume(undefined), null);
});

test('start needs at least two connected players', () => {
  const room = new Room();
  room.join('Solo', 'cat');
  assert.ok(room.start(0).error);
  assert.ok(room.addBot().player);
  assert.ok(room.start(0).ok);
  assert.equal(room.phase, PHASES.COUNTDOWN);
});

test('full race: countdown -> racing -> finished with ranked results', () => {
  const { room, a, b } = twoPlayers();
  room.setMap('desert');
  room.start(0);
  room.tick(RULES.countdownMs - 1);
  assert.equal(room.phase, PHASES.COUNTDOWN);
  room.tick(RULES.countdownMs);
  assert.equal(room.phase, PHASES.RACING);
  runUntilFinished(room, RULES.countdownMs);
  assert.equal(room.phase, PHASES.FINISHED);
  assert.deepEqual(room.results.map((r) => r.rank), [1, 2]);
  assert.deepEqual(new Set(room.results.map((r) => r.id)), new Set([a.id, b.id]));
  assert.ok(room.results.every((r) => r.timeMs > 0));
  assert.ok(room.results[0].timeMs <= room.results[1].timeMs);
  assert.equal(room.snapshot(0).race.trackLength, 720);
});

test('race is cut off at maxRaceMs', () => {
  const { room } = twoPlayers();
  room.start(0);
  room.tick(RULES.countdownMs);
  room.race = { ...room.race, racers: room.race.racers.map((r) => ({ ...r, target: 0, nextChangeAt: Infinity })) };
  room.tick(RULES.countdownMs + RULES.maxRaceMs);
  assert.equal(room.phase, PHASES.FINISHED);
  assert.ok(room.results.every((r) => r.timeMs === null));
});

test('map and animal are locked while racing, open again after', () => {
  const { room, a } = twoPlayers();
  room.start(0);
  assert.ok(room.setMap('snow').error);
  assert.ok(room.setAnimal(a.id, 'cat').error);
  assert.ok(room.start(1).error);
  assert.ok(room.backToLobby().error);
  runUntilFinished(room);
  assert.ok(room.setAnimal(a.id, 'cat').player);
  assert.ok(room.backToLobby().ok);
  assert.equal(room.phase, PHASES.LOBBY);
  assert.equal(room.race, null);
  assert.ok(room.setMap('snow').ok);
  assert.ok(room.setMap('moon').error);
});

test('late joiners wait for the next round', () => {
  const { room } = twoPlayers();
  room.start(0);
  const late = room.join('Cường', 'pig').player;
  const snap = room.snapshot(0);
  assert.equal(snap.players.find((p) => p.id === late.id).inRace, false);
  assert.equal(snap.race.racers.length, 2);
});

test('disconnected lobby players are dropped after the grace period, racers are kept', () => {
  const { room, a, b } = twoPlayers();
  room.disconnect(a.id, 0);
  room.tick(RULES.lobbyDisconnectGraceMs - 1);
  assert.ok(room.players.has(a.id));
  assert.equal(room.tick(RULES.lobbyDisconnectGraceMs), true);
  assert.ok(!room.players.has(a.id));

  room.addBot();
  room.start(100000);
  room.disconnect(b.id, 100000);
  room.tick(100000 + RULES.lobbyDisconnectGraceMs + 1);
  assert.ok(room.players.has(b.id), 'kept while racing');
});

test('bots are capped', () => {
  const room = new Room();
  for (let i = 0; i < RULES.maxBots; i += 1) assert.ok(room.addBot().player.isBot);
  assert.ok(room.addBot().error);
});

test('kicking a racer mid-race removes their lane (no ghost racers)', () => {
  const { room, a, b } = twoPlayers();
  room.start(0);
  room.remove(a.id);
  assert.deepEqual(room.race.racers.map((r) => r.id), [b.id]);
  runUntilFinished(room);
  assert.deepEqual(room.results.map((r) => r.id), [b.id]);
});

test('if every racer leaves during the countdown the room returns to the lobby', () => {
  const { room, a, b } = twoPlayers();
  room.start(0);
  room.remove(a.id);
  room.remove(b.id);
  assert.equal(room.phase, PHASES.LOBBY);
  assert.equal(room.race, null);
});

test('reserved names cannot impersonate the host', () => {
  const room = new Room();
  for (const name of ['Host', '📢 Host', ' admin ', 'MC!', '📢 Minh']) assert.ok(room.join(name, 'cat').error, name);
  assert.ok(room.join('Hoàng Host', 'cat').player);
});

test('leaving and rejoining does not jump the rotation queue', () => {
  const room = new Room();
  const people = Array.from({ length: RULES.raceSlots + 3 }, (_, i) => room.join(`P${i}`, 'cat').player);
  room.start(0);
  runUntilFinished(room);
  room.backToLobby();
  const raced = people.find((p) => room.players.get(p.id).lastRacedAt !== null);
  room.remove(raced.id);
  const back = room.join(raced.name, 'dog').player;
  assert.ok(room.snapshot(0).players.find((p) => p.id === back.id).queuePos > 3, 'still behind the 3 who waited');
});

test('bots cannot be turned into spectators', () => {
  const room = new Room();
  const bot = room.addBot().player;
  assert.ok(room.setSpectator(bot.id, true).error);
});

test('bots do not take seats from human players', () => {
  const room = new Room();
  for (let i = 0; i < RULES.maxBots; i += 1) room.addBot();
  for (let i = 0; i < RULES.maxPlayers; i += 1) assert.ok(room.join(`P${i}`, 'cat').player);
  assert.ok(room.join('Late', 'cat').error);
});

test('only raceSlots racers per round; the rest rotate in next round', () => {
  const room = new Room({ rng: seededRng(5) });
  const people = Array.from({ length: RULES.raceSlots + 5 }, (_, i) => room.join(`P${i}`, 'cat').player);
  room.start(0);
  const first = new Set(room.race.racers.map((r) => r.id));
  assert.equal(first.size, RULES.raceSlots);
  const waiting = people.filter((p) => !first.has(p.id));
  assert.equal(waiting.length, 5);
  const snap = room.snapshot(0);
  assert.ok(waiting.every((p) => snap.players.find((s) => s.id === p.id).queuePos <= 5), 'waiters are first in line');

  runUntilFinished(room);
  room.backToLobby();
  room.start(1000000);
  const second = new Set(room.race.racers.map((r) => r.id));
  assert.ok(waiting.every((p) => second.has(p.id)), 'everyone who waited races next');
});

test('humans take race slots before bots', () => {
  const room = new Room();
  for (let i = 0; i < RULES.maxBots; i += 1) room.addBot();
  for (let i = 0; i < RULES.raceSlots; i += 1) room.join(`P${i}`, 'dog');
  room.start(0);
  assert.ok(room.race.racers.every((r) => !room.players.get(r.id).isBot));
});

test('spectators never take a race slot and can switch back', () => {
  const { room, a, b } = twoPlayers();
  const fan = room.join('Fan', 'cat', { spectator: true }).player;
  room.start(0);
  assert.ok(!room.race.racers.some((r) => r.id === fan.id));
  assert.equal(room.snapshot(0).players.find((p) => p.id === fan.id).queuePos, null);
  assert.ok(room.setSpectator(a.id, true).error, 'cannot switch mid-race');
  runUntilFinished(room);
  room.backToLobby();
  assert.ok(room.setSpectator(fan.id, false).player);
  room.setSpectator(b.id, true);
  room.start(1000000);
  assert.deepEqual(new Set(room.race.racers.map((r) => r.id)), new Set([a.id, fan.id]));
});

test('setItems validates cosmetic accessories', () => {
  const { room, a } = twoPlayers();
  assert.deepEqual(room.setItems(a.id, ['brick', 'crown', 'brick']).player.items, ['brick', 'crown']);
  assert.ok(room.setItems(a.id, ['shoes', 'bull', 'rock', 'crown']).error);
  assert.ok(room.setItems(a.id, ['lightsaber']).error);
  assert.ok(room.setItems(a.id, 'brick').error);
  assert.ok(room.setItems('ghost', []).error);
  assert.deepEqual(room.snapshot(0).players.find((p) => p.id === a.id).items, ['brick', 'crown']);
});

test('throwItem is visual only: targets the racer ahead, respects ownership and cooldown', () => {
  const { room, a, b } = twoPlayers();
  room.setItems(a.id, ['brick', 'crown']);
  assert.ok(room.throwItem(a.id, 'brick', 0).error, 'not racing yet');
  room.start(0);
  room.tick(RULES.countdownMs);
  room.race = { ...room.race, racers: room.race.racers.map((r) => ({ ...r, pos: r.id === a.id ? 10 : 20 })) };
  const before = JSON.stringify(room.race.racers);

  const { fx } = room.throwItem(a.id, 'brick', 5000);
  assert.deepEqual(fx, { type: 'throw', item: 'brick', from: a.id, to: b.id, at: 5000 });
  assert.equal(JSON.stringify(room.race.racers), before, 'no effect on the race');
  assert.ok(room.throwItem(a.id, 'brick', 5000 + RULES.throwCooldownMs - 1).error, 'cooldown');
  assert.ok(room.throwItem(a.id, 'crown', 9000).error, 'crowns are not throwable');
  assert.ok(room.throwItem(b.id, 'brick', 9000).error, 'b does not own a brick');

  room.setItems(b.id, ['rock']);
  assert.equal(room.throwItem(b.id, 'rock', 9000).fx.to, a.id, 'the leader throws backwards');
});

test('setTitle sanitizes, allows clearing, rejects over-long titles', () => {
  const room = new Room();
  assert.ok(room.setTitle('  Giải đua   Tất niên 2026 ').ok);
  assert.equal(room.snapshot(0).title, 'Giải đua Tất niên 2026');
  assert.ok(room.setTitle('x'.repeat(RULES.titleMaxLength + 1)).error);
  assert.ok(room.setTitle('').ok);
  assert.equal(room.title, '');
});

test('react: anyone in the room can float an allowed emoji during a race, with a cooldown', () => {
  const { room, a } = twoPlayers();
  const fan = room.join('Fan', 'cat', { spectator: true }).player;
  assert.ok(room.react(fan.id, '🔥', 0).error, 'not during the lobby');
  room.start(0);
  assert.deepEqual(room.react(fan.id, '🔥', 100).fx, { type: 'react', emoji: '🔥', from: fan.id, at: 100 });
  assert.ok(room.react(fan.id, '😂', 100 + RULES.reactCooldownMs - 1).error, 'cooldown');
  assert.ok(room.react(fan.id, '😂', 100 + RULES.reactCooldownMs).fx);
  assert.ok(room.react(a.id, '<img>', 1000).error, 'only allowed emoji');
  assert.ok(room.react('ghost', '🔥', 1000).error);
});

test('default tracks make a race last roughly a minute and a half', () => {
  const room = new Room({ rng: seededRng(9) });
  room.join('A', 'cat');
  room.join('B', 'dog');
  room.setMap('meadow');
  room.start(0);
  runUntilFinished(room);
  const slowest = Math.max(...room.results.map((r) => r.timeMs));
  assert.ok(slowest > 60000 && slowest < 130000, `slowest ${slowest}ms`);
});

test('pause freezes everything; resume shifts time so the pause never counts', () => {
  const { room } = twoPlayers();
  room.start(0);
  room.tick(RULES.countdownMs);
  room.tick(RULES.countdownMs + 5000);
  const before = room.race.racers.map((r) => r.pos);
  assert.ok(room.pauseRace(8000).ok);
  assert.ok(room.pauseRace(8000).error, 'already paused');
  assert.equal(room.tick(60000), false, 'nothing moves while paused');
  assert.deepEqual(room.race.racers.map((r) => r.pos), before);
  assert.ok(room.throwItem('x', 'brick', 9000).error, 'no throwing while paused');
  assert.equal(room.snapshot(9000).race.paused, true);

  const startsAt = room.race.startsAt;
  assert.ok(room.resumeRace(68000).ok);
  assert.equal(room.race.startsAt, startsAt + 60000, 'start shifted by the pause length');
  assert.ok(room.resumeRace(68000).error, 'not paused any more');
  runUntilFinished(room, 68000);
  assert.ok(room.results.every((r) => r.timeMs < RULES.maxRaceMs), 'times exclude the 60 s pause');
});

test('pausing during the countdown delays the start', () => {
  const { room } = twoPlayers();
  room.start(0);
  room.pauseRace(1000);
  room.tick(RULES.countdownMs + 5000);
  assert.equal(room.phase, PHASES.COUNTDOWN);
  room.resumeRace(10000);
  room.tick(10000 + RULES.countdownMs - 1000);
  assert.equal(room.phase, PHASES.RACING);
});

test('restart reruns the race from the start line with the same racers', () => {
  const { room, a, b } = twoPlayers();
  room.join('Late', 'cat');
  room.start(0);
  const ids = room.race.racers.map((r) => r.id).sort();
  room.tick(RULES.countdownMs);
  room.tick(RULES.countdownMs + 10000);
  assert.ok(room.restartRace(20000).ok);
  assert.equal(room.phase, PHASES.COUNTDOWN);
  assert.deepEqual(room.race.racers.map((r) => r.id).sort(), ids);
  assert.ok(room.race.racers.every((r) => r.pos === 0 && r.finishedAt === null));
  runUntilFinished(room, 20000);
  assert.ok(room.restartRace(500000).ok, 'can also rerun a finished race');
  room.disconnect(a.id, 500000);
  room.disconnect(b.id, 500000);
  assert.ok(room.restartRace(500001).error, 'needs two connected racers');
});

test('abort cancels the race and returns to the lobby without results', () => {
  const { room } = twoPlayers();
  assert.ok(room.abortRace().error);
  room.start(0);
  assert.ok(room.abortRace().ok);
  assert.equal(room.phase, PHASES.LOBBY);
  assert.equal(room.race, null);
  assert.equal(room.results, null);
});

test('vehicle-only map: everyone rides a tank or helicopter, and gets their own animal back afterwards', () => {
  const room = new Room({ rng: seededRng(4) });
  const a = room.join('An', 'turtle').player;
  const b = room.join('Bình', 'tank').player;
  room.setSpecialMaps(true);
  assert.ok(room.setMap('saigon').ok);
  const ride = (p) => room.players.get(p.id).animal;
  assert.ok(['tank', 'tank843', 'helicopter', 'palace'].includes(ride(a)));
  assert.equal(ride(b), 'tank');
  assert.match(room.setAnimal(a.id, 'cat').error, /trực thăng hoặc dinh mini/);
  assert.ok(room.setAnimal(a.id, 'helicopter').player);
  const late = room.join('Cường', 'pig').player;
  assert.ok(['tank', 'tank843', 'helicopter', 'palace'].includes(late.animal), 'late joiners are swapped too');
  assert.ok(['tank', 'tank843', 'helicopter', 'palace'].includes(room.addBot().player.animal), 'bots follow the rule');

  assert.ok(room.setMap('meadow').ok);
  assert.equal(ride(a), 'turtle', 'own pick restored');
  assert.equal(ride(late), 'pig');
});

test('map-exclusive characters only appear on their own map', () => {
  const room = new Room({ rng: seededRng(8) });
  const a = room.join('An', 'dragon').player;
  assert.notEqual(a.animal, 'dragon', 'no dragons on the meadow');
  assert.ok(room.setAnimal(a.id, 'excavator').error);
  room.setMap('denhung');
  assert.equal(room.players.get(a.id).animal, 'dragon', 'their pick comes back on Đền Hùng');
  assert.ok(room.setAnimal(a.id, 'giong').player);
  room.setMap('congtruong');
  assert.ok(['excavator', 'roller', 'forklift', 'worker'].includes(room.players.get(a.id).animal));
  room.setMap('badinh');
  assert.ok(['cyclo', 'flowerBike', 'tram', 'vespa'].includes(room.players.get(a.id).animal));
  for (let i = 0; i < 5; i += 1) assert.ok(['cyclo', 'flowerBike', 'tram', 'vespa'].includes(room.addBot().player.animal));
});

test('host adds racers by name: they count as real players and follow map rules', () => {
  const room = new Room();
  const lan = room.addManual('  Chị Lan  ', 'cat').player;
  assert.equal(lan.name, 'Chị Lan');
  assert.equal(lan.isManual, true);
  assert.equal(lan.isBot, false);
  assert.ok(room.addManual('', 'cat').error);
  assert.ok(room.addManual('Host', 'cat').error, 'reserved names still blocked');
  assert.ok(room.addManual('Ai đó', 'unicorn').error);
  assert.ok(room.setSpectator(lan.id, true).error, 'no phone, so no audience mode');
  room.setSpecialMaps(true);
  room.setMap('saigon');
  assert.ok(['tank', 'tank843', 'helicopter', 'palace'].includes(room.players.get(lan.id).animal));
  room.setMap('meadow');
  assert.equal(room.players.get(lan.id).animal, 'cat');

  for (let i = 0; i < RULES.maxBots; i += 1) room.addBot();
  room.join('Phone', 'dog');
  room.start(0);
  assert.ok(room.race.racers.some((r) => r.id === lan.id), 'host-added racers outrank bots for a slot');
  assert.equal(room.snapshot(0).players.find((p) => p.id === lan.id).isManual, true);
});

test('host-picked duration sets the track length; races take about that long', () => {
  const room = new Room({ rng: seededRng(11) });
  room.join('A', 'cat');
  room.join('B', 'dog');
  assert.ok(room.setDuration(45).error, 'only the offered choices');
  assert.ok(room.setDuration(30).ok);
  assert.equal(room.snapshot(0).durationSec, 30);
  room.start(0);
  assert.equal(room.race.trackLength, RULES.baseSpeed * 30);
  assert.ok(room.setDuration(60).error, 'locked while racing');
  runUntilFinished(room);
  const slowest = Math.max(...room.results.map((r) => r.timeMs));
  assert.ok(slowest > 20000 && slowest < 45000, `slowest ${slowest}ms`);

  room.backToLobby();
  assert.ok(room.setDuration(180).ok);
  room.start(1000000);
  assert.equal(room.race.trackLength, RULES.baseSpeed * 180);
  assert.ok(room.race.endsAt - room.race.startsAt >= 180000 * 2, 'cut-off leaves room for long races');
  room.abortRace();
  assert.ok(room.setDuration(null).ok);
  room.setMap('desert');
  room.start(2000000);
  assert.equal(room.race.trackLength, 720, 'back to the map default');
});

test('provably fair: hash before, seed after, and the published data replays the exact result', async () => {
  const { createHash } = await import('node:crypto');
  const { simulateRace } = await import('../shared/simulate.js');
  const { rankRacers } = await import('../shared/race.js');
  const seed = 'c0ffee'.padEnd(64, '7');
  const room = new Room({ seedSource: () => seed });
  ['An', 'Bình', 'Chi', 'Dũng', 'Em'].forEach((n) => room.join(n, 'cat'));
  room.start(0);
  const during = room.snapshot(0).race.fairness;
  assert.equal(during.seed, null, 'seed stays secret while racing');
  assert.equal(during.seedHash, createHash('sha256').update(seed).digest('hex'));

  // Irregular server ticks must not change anything.
  let now = 0;
  while (room.phase !== PHASES.FINISHED) {
    now += 37 + Math.floor(Math.random() * 60);
    room.tick(now);
  }
  const after = room.snapshot(now).race.fairness;
  assert.equal(after.seed, seed, 'seed revealed once finished');
  assert.equal(after.modified, false);

  const replay = simulateRace({ seed: after.seed, ids: after.entrants, trackLength: after.trackLength, maxMs: after.maxMs });
  const replayOrder = rankRacers(replay.racers).map((r) => r.id);
  assert.deepEqual(room.results.map((r) => r.name), replayOrder, 'same finishing order');
  const replayTimes = new Map(replay.racers.map((r) => [r.id, Math.round(r.finishedAt)]));
  room.results.forEach((r) => assert.equal(r.timeMs, replayTimes.get(r.name), `${r.name} time`));
});

test('removing a racer mid-race is flagged in the fairness data', () => {
  const room = new Room();
  const a = room.join('An', 'cat').player;
  room.join('Bình', 'dog');
  room.join('Chi', 'pig');
  room.start(0);
  room.remove(a.id);
  assert.equal(room.snapshot(0).race.fairness.modified, true);
});

test('clearing the title does not touch other room settings', () => {
  const room = new Room();
  room.setDuration(120);
  room.setTitle('Cúp');
  room.setTitle('');
  assert.equal(room.durationSec, 120);
  assert.equal(room.title, '');
});

test('special (30/4) maps are opt-in per room', () => {
  const room = new Room();
  assert.match(room.setMap('saigon').error, /map đặc biệt/);
  assert.ok(room.setSpecialMaps(true).ok);
  assert.ok(room.setMap('saigon').ok);
  assert.equal(room.snapshot(0).allowSpecialMaps, true);
  room.join('A', 'cat');
  room.join('B', 'dog');
  room.start(0);
  assert.ok(room.setSpecialMaps(false).error, 'not mid-race');
  room.abortRace();
  assert.ok(room.setSpecialMaps(false).ok);
  assert.equal(room.mapId, 'meadow', 'turning it off leaves the special map');
});
