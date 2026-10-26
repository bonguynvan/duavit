import { MAPS, RULES, allowedAnimals, findAnimal, findMap, initialsOf, trackLengthFor } from '/shared/catalog.js';
import { paintAnimalCard, paintMapCard } from './draw.js';
import { RaceView, itemIcons } from './raceView.js';
import { RaceRecorder, slugify } from './recorder.js';
import { createSoundDirector, sound, soundForEffect } from './audio.js';
import { el, formatTime, request, roomStorage, socket, toast } from './net.js';
import { mountChat, messageNode } from './chat.js';
import { mountCommitBar } from './commitBar.js';
import { mountMusicPicker } from './musicPicker.js';

const $ = (id) => document.getElementById(id);
const showCommit = mountCommitBar($('commit-bar'));
mountMusicPicker(document.querySelector('.music-picker'));
// The host key arrives once in the link (?key=…); keep it per room and wipe it from the
// address bar so it doesn't end up on a projector, in a screenshot or in browser history.
const urlKey = new URLSearchParams(location.search).get('key');
if (urlKey) {
  roomStorage.set('hostKey', urlKey);
  history.replaceState(null, '', location.pathname);
}
const hostKey = urlKey ?? roomStorage.get('hostKey') ?? '';

let state = null;
let joinUrl = '';
let liveUrl = '';
let finishedSeenAt = 0;
let authed = false;
let rosterSignature = '';

const raceView = new RaceView($('race-canvas'), { showNames: true, drawResults: true });

const mapButtons = MAPS.map((map) => {
  const canvas = el('canvas', { 'aria-hidden': 'true' });
  const button = el('button', {
    type: 'button',
    class: 'map-option',
    role: 'radio',
    'aria-checked': 'false',
    onclick: () => act('host:map', { mapId: map.id }),
  }, canvas, el('span', {}, map.name, el('small', {}, `${map.trackLength}m`)));
  $('maps').append(button);
  return { map, button, canvas };
});

// ---------- race duration (host picks; default follows the map) ----------
const formatDuration = (s) => (s % 60 === 0 ? `${s / 60} phút` : s > 60 ? `${(s / 60).toLocaleString('vi-VN')} phút` : `${s} giây`);
const durationButtons = [null, ...RULES.durationChoices].map((seconds) => {
  const button = el('button', {
    type: 'button',
    role: 'radio',
    'aria-checked': 'false',
    onclick: () => act('host:duration', { seconds }),
  }, seconds === null ? 'Theo map' : formatDuration(seconds));
  $('duration').append(button);
  return { seconds, button };
});

function renderDuration() {
  const current = state.durationSec ?? null;
  const map = findMap(state.mapId) ?? MAPS[0];
  durationButtons.forEach(({ seconds, button }) => {
    button.setAttribute('aria-checked', String(seconds === current));
    if (seconds === null) {
      const avg = Math.round(map.trackLength / RULES.baseSpeed);
      button.textContent = `Theo map (~${avg}s)`;
    }
  });
  // Map cards show the length the next race will actually use.
  mapButtons.forEach(({ map: m, button }) => {
    const length = button.querySelector('small');
    if (length) length.textContent = `${trackLengthFor(m, current)}m`;
  });
}

async function act(event, data) {
  const reply = await request(event, data);
  if (reply.error) toast(reply.error);
  return reply;
}

const byQueue = (a, b) => (a.queuePos ?? Infinity) - (b.queuePos ?? Infinity);

function queueBadge(p) {
  if (p.queuePos === null) return null;
  const next = p.queuePos <= state.raceSlots;
  return el('span', { class: `queue${next ? ' next' : ''}` }, next ? 'lượt tới' : `chờ #${p.queuePos}`);
}

function renderRoster() {
  const signature = state.players.map((p) => `${p.id}:${p.name}:${p.animal}:${p.connected}:${p.items.join()}:${p.spectator}:${p.queuePos}`).join('|');
  if (signature === rosterSignature) return;
  rosterSignature = signature;
  const racers = state.players.filter((p) => !p.spectator).sort(byQueue);
  const cards = racers.map((p) => {
    const canvas = el('canvas', { 'aria-hidden': 'true' });
    const item = el('li', { class: `racer${p.connected ? '' : ' off'}` },
      canvas,
      queueBadge(p),
      el('strong', {}, p.name),
      el('small', {}, `${findAnimal(p.animal).name}${p.isBot ? ' · bot' : ''}${p.isManual ? ' · host thêm' : ''}${p.connected ? '' : ' · mất kết nối'}`),
      p.isBot || p.isManual ? null : el('button', { type: 'button', class: 'move', title: 'Chuyển sang khán giả', 'aria-label': `Chuyển ${p.name} sang khán giả`, onclick: () => act('host:spectator', { id: p.id, spectator: true }) }, '👀'),
      el('button', { type: 'button', class: 'kick', 'aria-label': `Mời ${p.name} ra`, onclick: () => act('host:kick', { id: p.id }) }, '✕'));
    return { item, canvas, p };
  });
  $('roster').replaceChildren(...cards.map((c) => c.item));
  cards.forEach(({ canvas, p }) => paintAnimalCard(canvas, findAnimal(p.animal), { initials: p.initials, color: p.color }, itemIcons(p.items)));

  const audience = state.players.filter((p) => p.spectator);
  $('audience').hidden = audience.length === 0;
  $('audience-count').textContent = `(${audience.length})`;
  $('audience-list').replaceChildren(...audience.map((p) =>
    el('li', {}, p.name,
      el('button', { type: 'button', title: 'Cho vào hàng đua', onclick: () => act('host:spectator', { id: p.id, spectator: false }) }, '🏁 vào đua'))));
}

function renderLobby() {
  mapButtons.forEach(({ map, button }) => {
    button.setAttribute('aria-checked', String(map.id === state.mapId));
    button.hidden = Boolean(map.special && !state.allowSpecialMaps); // 30/4 maps are opt-in
  });
  $('special-maps').checked = Boolean(state.allowSpecialMaps);
  renderDuration();
  const racers = state.players.filter((p) => !p.spectator);
  const queued = racers.filter((p) => p.queuePos !== null).length;
  $('player-count').textContent = String(racers.length);
  $('roster-sub').textContent = `Mỗi lượt ${state.raceSlots} người${queued > state.raceSlots ? ` · ${queued - state.raceSlots} người chờ lượt sau` : ''}`;
  $('roster-empty').hidden = state.players.length > 0;
  if (document.activeElement !== $('title-input')) $('title-input').value = state.title ?? '';
  renderRoster();
  if (!$('add-person-form').hidden) renderAddPersonPicker(); // follows map changes (vehicle-only maps)
  $('start').disabled = queued < 2;
}

function podiumEntry(result) {
  const canvas = el('canvas', { 'aria-hidden': 'true' });
  const player = state.players.find((p) => p.id === result.id);
  const face = { initials: player?.initials ?? result.name.slice(0, 1), color: result.color };
  requestAnimationFrame(() => paintAnimalCard(canvas, findAnimal(result.animal), face, itemIcons(player?.items)));
  return el('li', {}, canvas, el('strong', {}, result.name), el('small', {}, formatTime(result.timeMs)), el('div', { class: 'step' }, String(result.rank)));
}

// ---------- video: every race is filmed from the countdown to the results ----------
const VIDEO_KEEP = 5; // each clip is tens of MB held in memory
let raceNumber = 0;
const videos = [];

sound.init({ defaultOn: true }); // the host usually drives the projector speakers
const directSound = createSoundDirector();

const recorder = new RaceRecorder($('race-canvas'), {
  audio: () => (sound.enabled ? sound.stream() : null),
  onReady: ({ url, ext }) => {
    const stamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    const filename = `${slugify(state?.title || 'duavit')}-luot-${raceNumber}-${stamp}.${ext}`;
    videos.unshift({ url, filename, label: `Lượt ${raceNumber} · ${stamp}` });
    videos.splice(VIDEO_KEEP).forEach((old) => URL.revokeObjectURL(old.url));
    $('videos-empty').hidden = true;
    $('videos-list').replaceChildren(...videos.map((v) => el('li', {}, el('a', { href: v.url, download: v.filename }, el('span', {}, v.label), el('span', {}, '⬇ Tải')))));
    // Nothing downloads on its own: the host grabs a clip from the podium or the lobby list when wanted.
    $('podium-video').href = url;
    $('podium-video').download = filename;
    $('podium-video').hidden = false;
    toast(`🎬 Video lượt ${raceNumber} đã sẵn sàng — bấm "Tải video" nếu cần`);
  },
});
if (!recorder.supported) $('videos-empty').textContent = 'Trình duyệt này không hỗ trợ quay video (hãy dùng Chrome/Edge).';

let recorderBroken = false;
let recordedRaceKey = null;
function syncRecording(inArena) {
  if (recorderBroken || !recorder.supported) return;
  try {
    if (!inArena) {
      recorder.stopNow();
      raceView.lockSize(false);
    }
    else if (state.phase === 'countdown' && recordedRaceKey !== state.race.startsAt) {
      recordedRaceKey = state.race.startsAt;
      raceNumber += 1;
      $('podium-video').hidden = true; // the button always belongs to the race on screen
      raceView.lockSize(false);
      raceView.lockSize(true); // fix the resolution for the whole clip
      recorder.start(state.race.startsAt);
    } else if (state.phase === 'finished') recorder.finish();
    recorder.setPaused(Boolean(state.race?.paused));
  } catch (error) {
    // Never let video capture take the race screen down with it.
    recorderBroken = true;
    console.error('[recorder]', error);
    toast('Không quay được video trên trình duyệt này — cuộc đua vẫn chạy bình thường');
  }
  $('rec-dot').hidden = !recorder.recording;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && recorder.recording) toast('⚠️ Đang quay video — để tab host hiển thị, nếu không video sẽ bị đứng hình');
});

let podiumShownFor = null;
const PODIUM_DELAY_MS = 4500; // let the video capture the canvas results board first
function renderArena() {
  renderCommitBadge();
  const map = findMap(state.race.mapId);
  $('arena-map').textContent = state.title ? `${state.title} · ${map.name}` : map.name;
  const finished = state.phase === 'finished' && state.results && Date.now() - finishedSeenAt >= PODIUM_DELAY_MS;
  $('podium-layer').hidden = !finished;
  if (!finished || podiumShownFor === state.race.startsAt) return;
  podiumShownFor = state.race.startsAt;
  renderFairness();
  $('podium').replaceChildren(...state.results.slice(0, 3).map(podiumEntry));
  $('others').replaceChildren(...state.results.slice(3).map((r) => el('li', {}, `${r.name} `, el('small', {}, formatTime(r.timeMs)))));
}

function tickTimer() {
  if (state?.race && state.phase !== 'lobby') {
    const offset = raceView.clockOffset;
    const now = state.race.paused ? state.race.pausedAt : Date.now() + offset;
    const end = state.phase === 'finished' && state.results ? Math.max(0, ...state.results.map((r) => r.timeMs ?? 0)) : now - state.race.startsAt;
    $('arena-timer').textContent = `${Math.max(0, end / 1000).toFixed(1)}s`;
  }
  requestAnimationFrame(tickTimer);
}

function render() {
  if (!state || !authed) return;
  const inArena = Boolean(state.phase !== 'lobby' && state.race);
  const lobbyWasHidden = $('lobby').hidden;
  $('lobby').hidden = inArena;
  $('arena').hidden = !inArena;
  if (state.phase === 'finished' && finishedSeenAt === 0) {
    finishedSeenAt = Date.now();
    setTimeout(render, PODIUM_DELAY_MS + 50);
  }
  if (state.phase !== 'finished') finishedSeenAt = 0;
  directSound(state, raceView.clockOffset);
  if (inArena) {
    raceView.setState(state);
    raceView.start();
    renderArena();
    renderControls();
    syncRecording(true); // after the arena is visible, so the canvas has its real size
  } else {
    syncRecording(false);
    raceView.stop();
    if (lobbyWasHidden) {
      // Canvases only have a size once visible, so repaint everything on (re)entry.
      rosterSignature = '';
      mapButtons.forEach(({ map, canvas }) => paintMapCard(canvas, map));
    }
    renderLobby();
  }
}

socket.on('connect', async () => {
  const reply = await request('host:auth', { key: hostKey });
  if (reply.error) {
    $('denied').hidden = false;
    $('denied-reason').textContent = reply.error;
    return;
  }
  authed = true;
  $('join-url').textContent = reply.joinUrl;
  $('room-code').textContent = reply.code;
  joinUrl = reply.joinUrl;
  liveUrl = reply.liveUrl;
  if (reply.qr) $('qr').src = reply.qr;
  render();
});

// Lightweight 20 Hz race frames: merge into the last full state.
socket.on('race', (frame) => {
  if (!state) return;
  state = { ...state, ...frame };
  render();
});

socket.on('state', (next) => {
  state = next;
  render();
});

// Chat: full log in the lobby, short-lived floating bubbles over the race.
const ARENA_CHAT_MAX = 5;
const ARENA_CHAT_TTL_MS = 9000;
mountChat({
  log: $('chat-log'),
  form: $('chat-form'),
  input: $('chat-input'),
  onMessage: (message) => {
    const node = messageNode(message);
    $('arena-chat').append(node);
    while ($('arena-chat').children.length > ARENA_CHAT_MAX) $('arena-chat').firstElementChild.remove();
    setTimeout(() => node.classList.add('leaving'), ARENA_CHAT_TTL_MS);
    setTimeout(() => node.remove(), ARENA_CHAT_TTL_MS + 600);
  },
});

// ---------- share links ----------
async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Đã sao chép ${label}`);
  } catch {
    window.prompt(`Sao chép ${label}:`, text); // clipboard API needs HTTPS; fall back to manual copy
  }
}
$('copy-player').addEventListener('click', () => copy(joinUrl, 'link người chơi'));
$('copy-live').addEventListener('click', () => copy(liveUrl, 'link OBS'));
$('special-maps').addEventListener('change', () => act('host:specialMaps', { allowed: $('special-maps').checked }));

// ---------- provably fair: commitment during the race, seed + proof file afterwards ----------
function renderCommitBadge() {
  showCommit(state?.race?.fairness?.seedHash ?? null);
}

function renderFairness() {
  const fairness = state.race?.fairness;
  $('fairness').hidden = !fairness?.seed;
  if (!fairness?.seed) return;
  $('proof-hash').textContent = fairness.seedHash;
  $('proof-seed').textContent = fairness.seed;
  $('proof-note').textContent = fairness.modified
    ? '⚠️ Có tay đua bị mời ra giữa chừng, nên chạy lại sẽ khác kết quả trên màn hình.'
    : 'Ai cũng có thể chạy lại cuộc đua từ seed này và ra đúng kết quả.';
}

$('download-proof').addEventListener('click', () => {
  const fairness = state.race?.fairness;
  if (!fairness?.seed) return;
  const proof = { kind: 'peti-race-proof', version: 1, title: state.title, mapId: state.race.mapId, ...fairness, createdAt: new Date().toISOString() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' }));
  const link = el('a', { href: url, download: `kiem-chung-${slugify(state.title || 'duavit')}-luot-${raceNumber}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('copy-host').addEventListener('click', () => copy(`${location.origin}${location.pathname}?key=${hostKey}`, 'link host (giữ bí mật!)'));

socket.on('fx', (fx) => {
  raceView.addEffect(fx);
  soundForEffect(fx);
});

// ---------- race controls ----------
const ABORT_CONFIRM_MS = 3000;
let abortArmedUntil = 0;

function renderControls() {
  if (!state?.race) return;
  const running = state.phase === 'countdown' || state.phase === 'racing';
  $('pause-btn').hidden = !running;
  $('abort-btn').hidden = !running;
  $('pause-btn').textContent = state.race.paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
}

function renderSoundButtons() {
  const label = sound.enabled ? '🔊' : '🔇';
  $('sound-btn').textContent = `${label} Nhạc`;
  $('sound-btn').setAttribute('aria-pressed', String(sound.enabled));
  $('arena-sound-btn').textContent = label;
}

$('pause-btn').addEventListener('click', () => act(state?.race?.paused ? 'host:resume' : 'host:pause'));
$('restart-btn').addEventListener('click', () => act('host:restart'));
$('abort-btn').addEventListener('click', () => {
  // Two clicks to cancel, so a stray click can't wipe a race (no blocking confirm dialog).
  if (Date.now() > abortArmedUntil) {
    abortArmedUntil = Date.now() + ABORT_CONFIRM_MS;
    $('abort-btn').classList.add('armed');
    $('abort-btn').textContent = '⏹ Bấm lần nữa để hủy';
    setTimeout(() => {
      $('abort-btn').classList.remove('armed');
      $('abort-btn').textContent = '⏹ Hủy lượt';
    }, ABORT_CONFIRM_MS);
    return;
  }
  abortArmedUntil = 0;
  act('host:abort');
});
[$('sound-btn'), $('arena-sound-btn')].forEach((button) => button.addEventListener('click', () => {
  sound.toggle();
  renderSoundButtons();
}));
renderSoundButtons();
document.addEventListener('keydown', (event) => {
  // Space = pause/resume while racing (handy on a presenter remote / keyboard).
  if (event.code !== 'Space' || $('arena').hidden || document.activeElement?.tagName === 'INPUT') return;
  event.preventDefault();
  $('pause-btn').click();
});

$('title-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const reply = await act('host:title', { title: $('title-input').value });
  if (reply.ok) {
    toast('Đã lưu tên cuộc đua');
    $('title-input').blur();
  }
});

// ---------- host adds racers by hand (name + character) ----------
let addPersonAnimal = null;
let addPersonMap = null;

function renderAddPersonPicker(force = false) {
  const map = findMap(state?.mapId) ?? MAPS[0];
  const options = allowedAnimals(map);
  if (!options.some((a) => a.id === addPersonAnimal)) addPersonAnimal = options[0].id;
  if (!force && addPersonMap === map.id) return;
  addPersonMap = map.id;
  const face = { initials: initialsOf($('add-person-name').value || '?'), color: '#18a999' };
  $('add-person-animals').replaceChildren(...options.map((animal) => {
    const canvas = el('canvas', { 'aria-hidden': 'true' });
    const button = el('button', {
      type: 'button',
      class: 'animal-option',
      'aria-pressed': String(animal.id === addPersonAnimal),
      onclick: () => {
        addPersonAnimal = animal.id;
        renderAddPersonPicker(true);
      },
    }, canvas, el('span', {}, animal.name));
    requestAnimationFrame(() => paintAnimalCard(canvas, animal, face));
    return button;
  }));
}

function toggleAddPerson(open) {
  $('add-person-form').hidden = !open;
  $('add-person').setAttribute('aria-expanded', String(open));
  if (open) {
    renderAddPersonPicker(true);
    $('add-person-name').focus();
  }
}

$('add-person').addEventListener('click', () => toggleAddPerson($('add-person-form').hidden));
$('add-person-close').addEventListener('click', () => toggleAddPerson(false));
let addPersonTyping = 0;
$('add-person-name').addEventListener('input', () => {
  clearTimeout(addPersonTyping);
  addPersonTyping = setTimeout(() => renderAddPersonPicker(true), 150); // refresh the initials on the faces
});
$('add-person-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const reply = await act('host:addPlayer', { name: $('add-person-name').value, animal: addPersonAnimal });
  if (reply.ok) {
    toast(`Đã thêm ${$('add-person-name').value.trim()}`);
    $('add-person-name').value = '';
    renderAddPersonPicker(true);
    $('add-person-name').focus(); // ready for the next name
  }
});
$('start').addEventListener('click', () => act('host:start'));
$('rematch').addEventListener('click', () => act('host:start'));
$('to-lobby').addEventListener('click', () => act('host:lobby'));
requestAnimationFrame(tickTimer);
