// "Đua nhanh": paste names, race, done. Runs entirely in the browser (no login, no server).
import { MAPS, RULES, allowedAnimals, findAnimal, findMap } from '/shared/catalog.js';
import { newSeed, sha256Hex } from '/shared/fair.js';
import { parseNames } from '/shared/names.js';
import { rankRacers } from '/shared/race.js';
import { paintAnimalCard, paintMapCard } from './draw.js';
import { RaceView } from './raceView.js';
import { RaceRecorder, slugify } from './recorder.js';
import { createSoundDirector, sound, soundForEffect } from './audio.js';
import { el, formatTime, toast } from './ui.js';
import { Playback, prepareRace } from './quick/playback.js';
import { pickThrow } from './quick/fun.js';
import { mountCommitBar } from './commitBar.js';
import { mountMusicPicker } from './musicPicker.js';

const $ = (id) => document.getElementById(id);
const showCommit = mountCommitBar($('commit-bar'));
mountMusicPicker(document.querySelector('.music-picker'));
const STORE_KEY = 'peti.quick';
const MAX_LANES = 12;
const STATE_HZ_MS = 50;
const BOARD_MS = 250;
const BOARD_SIZE = 10;
// Fun mode: a visual-only throw every 1.5–4 s once the racers are off.
const FIRST_THROW_AFTER_MS = 2500;
const THROW_MIN_MS = 1500;
const THROW_SPREAD_MS = 2500;

// ---------------- settings (remembered between visits) ----------------
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {}; } catch { return {}; }
})();
const settings = {
  names: saved.names ?? '',
  title: saved.title ?? '',
  mapId: findMap(saved.mapId) ? saved.mapId : MAPS[0].id,
  special: Boolean(saved.special),
  durationSec: saved.durationSec ?? 60,
  character: saved.character ?? 'random',
  fun: saved.fun ?? true,
};
const persist = () => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
};

const formatDuration = (s) => (s === null ? 'Theo map' : s % 60 === 0 ? `${s / 60} phút` : s > 60 ? `${(s / 60).toLocaleString('vi-VN')} phút` : `${s} giây`);

function renderNamesCount() {
  const { names, dropped } = parseNames($('names').value);
  $('names-count').textContent = `${names.length} người`;
  $('names-hint').textContent = dropped > 0 ? `⚠️ Chỉ lấy 500 tên đầu, bỏ ${dropped} tên.` : 'Tối đa 500 tên. Tên trùng sẽ được đánh số (2), (3)…';
  $('start').textContent = names.length >= 2 ? `🏁 Bắt đầu đua (${names.length} tay đua)` : '🏁 Cần ít nhất 2 tên';
  $('start').disabled = names.length < 2;
}

function renderMaps() {
  const maps = MAPS.filter((m) => settings.special || !m.special);
  if (!maps.some((m) => m.id === settings.mapId)) settings.mapId = maps[0].id;
  $('maps').replaceChildren(...maps.map((map) => {
    const canvas = el('canvas', { 'aria-hidden': 'true' });
    const button = el('button', {
      type: 'button', class: 'map-option', role: 'radio', 'aria-checked': String(map.id === settings.mapId),
      onclick: () => {
        settings.mapId = map.id;
        persist();
        renderMaps();
        renderCharacters();
      },
    }, canvas, el('span', {}, map.name));
    requestAnimationFrame(() => paintMapCard(canvas, map));
    return button;
  }));
}

function renderDurations() {
  $('duration').replaceChildren(...[null, ...RULES.durationChoices].map((seconds) => el('button', {
    type: 'button', role: 'radio', 'aria-checked': String(seconds === settings.durationSec),
    onclick: () => {
      settings.durationSec = seconds;
      persist();
      renderDurations();
    },
  }, formatDuration(seconds))));
}

function renderCharacters() {
  const options = allowedAnimals(findMap(settings.mapId));
  if (settings.character !== 'random' && !options.some((a) => a.id === settings.character)) settings.character = 'random';
  $('character').replaceChildren(
    el('option', { value: 'random' }, 'Ngẫu nhiên (mỗi người một kiểu)'),
    ...options.map((a) => el('option', { value: a.id }, `Tất cả là ${a.name}`)),
  );
  $('character').value = settings.character;
}

// ---------------- race ----------------
const raceView = new RaceView($('race-canvas'), { showNames: true, maxLanes: MAX_LANES, viewUnits: 70, drawResults: true });
sound.init({ defaultOn: true });
const directSound = createSoundDirector();
let current = null; // { race, playback, seed, seedHash, names, timer, boardAt, finished, video }

const recorder = new RaceRecorder($('race-canvas'), {
  audio: () => (sound.enabled ? sound.stream() : null),
  onReady: ({ url, ext }) => {
    if (!current) return;
    current.video = { url, filename: `${slugify(settings.title || 'dua-nhanh')}.${ext}` };
    $('download-video').href = url;
    $('download-video').download = current.video.filename;
    $('download-video').hidden = false;
  },
});

async function startRace() {
  const { names } = parseNames($('names').value);
  if (names.length < 2) return toast('Cần ít nhất 2 tên');
  stopRace();
  const seed = newSeed();
  const seedHash = await sha256Hex(seed);
  stopRace(); // a double click may have started another race while we awaited: keep only this one
  const race = prepareRace({ names, mapId: settings.mapId, durationSec: settings.durationSec, character: settings.character, seed, fun: settings.fun });
  raceView.showNames = names.length <= MAX_LANES;
  const playback = new Playback(race, { title: settings.title });
  current = { race, playback, seed, seedHash, names, finished: false, boardAt: 0, video: null, nextThrowAt: playback.startsAt + FIRST_THROW_AFTER_MS };

  $('setup').hidden = true;
  $('race').hidden = false;
  $('results').hidden = true;
  $('download-video').hidden = true;
  $('pause').textContent = '⏸ Tạm dừng';
  showCommit(seedHash);
  raceView.start();
  current.timer = setInterval(tick, STATE_HZ_MS);
  tick();
  // Film the whole race (after the canvas has its on-screen size).
  requestAnimationFrame(() => {
    raceView.lockSize(false);
    raceView.lockSize(true);
    recorder.start(playback.startsAt);
  });
}

function stopRace() {
  if (!current) return;
  clearInterval(current.timer);
  recorder.cancel();
  raceView.stop();
  raceView.lockSize(false);
  current = null;
  directSound({ phase: 'lobby', race: null }, 0); // stops the soundtrack and any pending countdown beeps
  sound.setMusic('none');
}

function tick() {
  if (!current) return;
  const state = current.playback.state();
  raceView.setState(state);
  directSound(state, 0);
  recorder.setPaused(current.playback.paused);
  maybeThrow(state);
  if (Date.now() - current.boardAt > BOARD_MS) {
    current.boardAt = Date.now();
    renderBoard(state);
  }
  if (state.phase === 'finished' && !current.finished) {
    current.finished = true;
    recorder.finish();
    setTimeout(() => showResults(state), 1200);
  }
}

/** Fun mode: now and then a racer throws something at the one ahead. Visual only. */
function maybeThrow(state) {
  const now = Date.now();
  if (!settings.fun || state.phase !== 'racing' || current.playback.paused || now < current.nextThrowAt) return;
  current.nextThrowAt = now + THROW_MIN_MS + Math.random() * THROW_SPREAD_MS;
  const fx = pickThrow(state.race.racers, current.race.players, Math.random);
  if (!fx) return;
  raceView.addEffect(fx);
  soundForEffect(fx);
}

function renderBoard(state) {
  const names = new Map(current.race.players.map((p) => [p.id, p.name]));
  const top = rankRacers(state.race.racers).slice(0, BOARD_SIZE);
  $('live-board').replaceChildren(...top.map((r, i) => el('li', {},
    el('span', { class: 'pos' }, String(i + 1)),
    el('span', { class: 'name' }, names.get(r.id)),
    el('span', { class: 'meta' }, r.finishedAt !== null ? '🏁' : `${Math.round((r.pos / state.race.trackLength) * 100)}%`))));
}

function showResults(state) {
  if (!current) return;
  const { results } = state;
  $('results-title').textContent = `🏆 ${results[0].name} về nhất!`;
  $('podium').replaceChildren(...results.slice(0, 3).map((r) => {
    const canvas = el('canvas', { 'aria-hidden': 'true' });
    const player = current.race.players.find((p) => p.id === r.id);
    requestAnimationFrame(() => paintAnimalCard(canvas, findAnimal(r.animal), { initials: player.initials, color: r.color }));
    return el('li', {}, canvas, el('strong', {}, r.name), el('small', {}, formatTime(r.timeMs)), el('div', { class: 'step' }, String(r.rank)));
  }));
  $('full-results').replaceChildren(...results.slice(3).map((r) => el('li', {}, `${r.name} `, el('small', {}, formatTime(r.timeMs)))));
  $('proof-hash').textContent = current.seedHash;
  $('proof-seed').textContent = current.seed;
  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = el('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const resultLines = () => current.race.results.map((r) => `${r.rank}. ${r.name} — ${formatTime(r.timeMs)}`);
const csvCell = (v) => {
  const text = String(v);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; // CSV formula injection
  return `"${safe.replace(/"/g, '""')}"`;
};

// ---------------- wiring ----------------
$('names').value = settings.names;
$('title').value = settings.title;
$('special-maps').checked = settings.special;
$('fun-mode').checked = settings.fun;
renderNamesCount();
renderMaps();
renderDurations();
renderCharacters();

$('names').addEventListener('input', () => {
  settings.names = $('names').value;
  persist();
  renderNamesCount();
});
$('names-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 1_000_000) return toast('File quá lớn (tối đa 1 MB)');
  $('names').value = await file.text();
  $('names').dispatchEvent(new Event('input'));
  event.target.value = '';
});
$('names-clear').addEventListener('click', () => {
  $('names').value = '';
  $('names').dispatchEvent(new Event('input'));
});
$('title').addEventListener('input', () => {
  settings.title = $('title').value.trim();
  persist();
});
$('special-maps').addEventListener('change', () => {
  settings.special = $('special-maps').checked;
  persist();
  renderMaps();
  renderCharacters();
});
$('fun-mode').addEventListener('change', () => {
  settings.fun = $('fun-mode').checked;
  persist();
});
$('character').addEventListener('change', () => {
  settings.character = $('character').value;
  persist();
});

$('start').addEventListener('click', startRace);
$('again').addEventListener('click', startRace);
const backToSetup = () => {
  stopRace();
  $('race').hidden = true;
  $('setup').hidden = false;
};
$('edit').addEventListener('click', backToSetup);
$('pause').addEventListener('click', () => {
  if (!current || current.finished) return;
  if (current.playback.paused) current.playback.resume();
  else current.playback.pause();
  $('pause').textContent = current.playback.paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
  tick();
});
$('fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else $('race-stage').requestFullscreen?.().catch(() => toast('Trình duyệt không cho toàn màn hình'));
});
const renderSound = () => { $('sound').textContent = sound.enabled ? '🔊' : '🔇'; };
$('sound').addEventListener('click', () => {
  sound.toggle();
  renderSound();
});
renderSound();
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || $('race').hidden || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  event.preventDefault();
  $('pause').click();
});

$('copy-results').addEventListener('click', async () => {
  const text = [settings.title || 'Kết quả đua', ...resultLines()].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    toast('Đã sao chép kết quả');
  } catch {
    download('ket-qua.txt', text, 'text/plain');
  }
});
$('download-csv').addEventListener('click', () => {
  const rows = [['Hạng', 'Tên', 'Thời gian (giây)'], ...current.race.results.map((r) => [r.rank, r.name, r.timeMs === null ? '' : (r.timeMs / 1000).toFixed(2)])];
  // BOM so Excel opens Vietnamese text correctly.
  download(`${slugify(settings.title || 'ket-qua-dua')}.csv`, `\ufeff${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`, 'text/csv');
});
$('download-proof').addEventListener('click', () => {
  const proof = {
    kind: 'peti-race-proof', version: 1, title: settings.title, mapId: current.race.mapId,
    seed: current.seed, seedHash: current.seedHash, entrants: current.names,
    trackLength: current.race.trackLength, maxMs: current.race.maxMs, createdAt: new Date().toISOString(),
  };
  download(`kiem-chung-${slugify(settings.title || 'dua-nhanh')}.json`, JSON.stringify(proof, null, 2), 'application/json');
});
