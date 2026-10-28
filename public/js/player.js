import { ANIMALS, MAPS, REACTIONS, RULES, animalForMap, characterGroups, findAnimal, findItem, findMap, groupOf, initialsOf, isAnimalAllowed, withCast } from '/shared/catalog.js';
import { paintAnimalCard } from './draw.js';
import { RaceView, itemIcons } from './raceView.js';
import { rankRacers } from '/shared/race.js';
import { el, formatTime, request, roomStorage, socket, toast } from './net.js';
import { mountChat } from './chat.js';
import { DemoRace } from './demo.js';
import { createShop } from './shop.js';
import { WelcomeParade } from './welcome.js';
import { createRoomPanel } from './roomPanel.js';
import { createSoundDirector, sound, soundForEffect } from './audio.js';
import { pageContaining, paginate } from './paging.js';
import { showStatus } from './statusBanner.js';


const PREVIEW_COLOR = '#ff5a36';
const RANKING_REFRESH_MS = 250;

const storage = {
  get: () => roomStorage.get('token'),
  set: (value) => roomStorage.set('token', value),
  clear: () => roomStorage.remove('token'),
};

const $ = (id) => document.getElementById(id);
const views = { welcome: $('view-welcome'), join: $('view-join'), lobby: $('view-lobby'), race: $('view-race') };

let state = null;
let myId = null;
let resumed = false;
let seenSelf = false;
let welcomed = false; // first visit shows the welcome screen, then the join form
const STARTERS = ANIMALS.filter((a) => groupOf(a) === 'animals'); // the picker opens on the animals tab
let joinAnimal = STARTERS[Math.floor(Math.random() * STARTERS.length)].id;

const PHONE_VIEW_METRES = 45;
const PICKER_PAGE_SIZE = 8; // two rows of four on a phone
const raceView = new RaceView($('race-canvas'), {
  highlightId: () => myId,
  focusId: () => (me()?.inRace ? myId : null), // spectators/waiters follow the leader
  showNames: false,
  viewUnits: PHONE_VIEW_METRES,
});

function forget() {
  myId = null;
  seenSelf = false;
  storage.clear();
}

// The map as this room plays it (the host may open it to every character).
const currentMap = () => withCast(findMap(state?.mapId) ?? MAPS[0], state?.allCharacters);
const castKey = () => `${state?.mapId}|${Boolean(currentMap().allCharacters)}`;
const me = () => state?.players.find((p) => p.id === myId) ?? null;

/**
 * Character picker: one tab per character group the map allows (tabs only when there are several),
 * and the grid shows the active group, a page at a time. Builds the buttons once; `update` repaints.
 */
function createPicker(container, onPick) {
  const tabs = el('div', { class: 'picker-tabs', role: 'tablist', 'aria-label': 'Nhóm nhân vật' });
  container.before(tabs);
  const turn = (delta) => {
    page += delta;
    render(...last);
  };
  const prev = el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => turn(-1) }, '‹ Trước');
  const next = el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => turn(1) }, 'Sau ›');
  const pageLabel = el('span', { class: 'picker-page' });
  const pager = el('div', { class: 'picker-pager', role: 'group', 'aria-label': 'Trang nhân vật' }, prev, pageLabel, next);
  container.after(pager);
  let page = 0;
  const buttons = ANIMALS.map((animal) => {
    const canvas = el('canvas', { 'aria-hidden': 'true' });
    const button = el('button', { type: 'button', class: 'animal-option', 'aria-pressed': 'false', onclick: () => onPick(animal.id) }, canvas, el('span', {}, animal.name));
    container.append(button);
    return { animal, button, canvas };
  });
  let activeGroup = null;
  let tabsKey = '';
  let last = null;

  const render = (selectedId, face, map) => {
    const groups = characterGroups(map);
    if (!groups.some((g) => g.id === activeGroup)) {
      // Open on the selected character's group (or the first one) when the map changes.
      const selected = findAnimal(selectedId);
      const own = selected && isAnimalAllowed(map, selectedId) ? groupOf(selected) : null;
      activeGroup = groups.find((g) => g.id === own)?.id ?? groups[0]?.id ?? null;
      page = pageContaining(groups.find((g) => g.id === activeGroup)?.animals ?? [], PICKER_PAGE_SIZE, (a) => a.id === selectedId);
    }
    const key = groups.map((g) => g.id).join();
    if (key !== tabsKey) { // rebuild only when the set changes, so a focused tab keeps focus
      tabsKey = key;
      tabs.replaceChildren(...groups.map((g) => el('button', {
        type: 'button', role: 'tab', class: 'picker-tab', 'data-group': g.id,
        onclick: () => {
          activeGroup = g.id;
          page = pageContaining(g.animals, PICKER_PAGE_SIZE, (a) => a.id === last[0]);
          render(...last);
        },
      }, `${g.icon} ${g.name} `, el('small', {}, String(g.animals.length)))));
    }
    tabs.hidden = groups.length < 2;
    for (const tab of tabs.children) tab.setAttribute('aria-selected', String(tab.dataset.group === activeGroup));
    const view = paginate(groups.find((g) => g.id === activeGroup)?.animals ?? [], PICKER_PAGE_SIZE, page);
    page = view.page;
    pager.hidden = view.pages < 2;
    pageLabel.textContent = `Trang ${view.page + 1}/${view.pages}`;
    prev.disabled = view.page === 0;
    next.disabled = view.page === view.pages - 1;
    const shown = new Set(view.items.map((a) => a.id));
    buttons.forEach(({ animal, button, canvas }) => {
      button.hidden = !shown.has(animal.id);
      button.setAttribute('aria-pressed', String(animal.id === selectedId));
      if (!button.hidden) paintAnimalCard(canvas, animal, face);
    });
  };

  return {
    /** Repaint faces/selection for `map`; characters outside the active group are hidden. */
    update(selectedId, face, map) {
      last = [selectedId, face, map];
      render(selectedId, face, map);
    },
  };
}

const joinFace = () => ({ initials: initialsOf($('name-input').value || '?'), color: PREVIEW_COLOR });

let joinPickedByUser = false;
const joinPicker = createPicker($('join-animals'), (id) => {
  joinPickedByUser = true;
  joinAnimal = id;
  joinPicker.update(joinAnimal, joinFace(), currentMap());
});

const lobbyPicker = createPicker($('lobby-animals'), async (id) => {
  const reply = await request('player:animal', { animal: id });
  if (reply.error) toast(reply.error);
});

const shop = createShop($('shop-grid'), $('shop-count'));
// Phones start muted: 30 phones blasting music in one room is chaos. One tap turns it on.
sound.init({ defaultOn: false });
const directSound = createSoundDirector();
const renderSoundToggle = () => {
  $('sound-toggle').textContent = sound.enabled ? '🔊' : '🔇';
  $('sound-toggle').setAttribute('aria-pressed', String(sound.enabled));
};
renderSoundToggle();
$('sound-toggle').addEventListener('click', () => {
  sound.toggle();
  renderSoundToggle();
});
const roomPanel = createRoomPanel($('room-panel'));
const wideQuery = window.matchMedia('(min-width: 900px)');

const demo = new DemoRace($('demo-canvas'), { getMe: () => me(), getMapId: () => state?.mapId });

const parade = new WelcomeParade($('welcome-canvas'), () => state?.mapId);

function show(name) {
  Object.entries(views).forEach(([key, node]) => { node.hidden = key !== name; });
  if (name === 'welcome') parade.start();
  else parade.stop();
  if (name === 'race') raceView.start();
  else raceView.stop();
  if (name === 'lobby') demo.start();
  else demo.stop();
}

const PHASE_TEXT = {
  lobby: 'đang chờ host bắt đầu',
  countdown: 'sắp xuất phát!',
  racing: 'đang đua — vào xem ngay',
  finished: 'vừa đua xong',
};

function renderWelcome() {
  const people = state.players.filter((p) => !p.isBot && p.connected).length;
  const title = state.title ? `${state.title} · ` : '';
  $('room-live-text').textContent = `${title}${people} người trong phòng · map ${currentMap().name} · ${PHASE_TEXT[state.phase] ?? ''}`;
}

let joinPickerMap = null;
function renderJoin(entering) {
  const map = currentMap();
  if (!entering && joinPickerMap === castKey()) return;
  joinPickerMap = castKey();
  // Themed event maps (Tết) start newcomers on their own cast, until they pick something themselves.
  const own = characterGroups(map).find((g) => g.id === map.id);
  if (own && !joinPickedByUser && groupOf(findAnimal(joinAnimal)) !== map.id) joinAnimal = own.animals[Math.floor(Math.random() * own.animals.length)].id;
  joinAnimal = animalForMap(map, joinAnimal); // e.g. Dinh Độc Lập: vehicles only
  joinPicker.update(joinAnimal, joinFace(), map);
}

let lobbySignature = '';
function renderLobby(player, entering) {
  const signature = [castKey(), player.animal, player.items.join(), player.spectator, player.queuePos, ...state.players.map((p) => `${p.id}:${p.connected}:${p.name}:${p.spectator}`)].join('|');
  if (!entering && signature === lobbySignature) return; // race frames arrive at 20 Hz; skip identical repaints
  lobbySignature = signature;
  const face = { initials: player.initials, color: player.color };
  $('me-name').textContent = `${player.name} · ${findAnimal(player.animal).name}`;
  paintAnimalCard($('me-canvas'), findAnimal(player.animal), face, itemIcons(player.items));
  lobbyPicker.update(player.animal, face, currentMap());
  shop.update(player.items);
  $('lobby-status').textContent = queueText(player);
  $('role-btn').textContent = player.spectator ? '🏁 Tham gia đua' : '👀 Chuyển sang khán giả';

}

function queueText(player) {
  if (player.spectator) return 'Bạn đang là khán giả 👀 — xem và chat thoải mái';
  if (player.queuePos === null) return 'Đang kết nối lại…';
  if (player.queuePos <= state.raceSlots) return `✅ Bạn sẽ đua ở lượt tới (${state.raceSlots} người mỗi lượt)`;
  return `Bạn đang ở vị trí #${player.queuePos} trong hàng chờ — mỗi lượt ${state.raceSlots} người`;
}

// ---------- throwing (visual only) ----------
let throwSignature = '';
function renderThrowBar(player) {
  const throwables = player.inRace && state.phase === 'racing' ? player.items.filter((id) => findItem(id)?.throwable) : [];
  const signature = throwables.join();
  $('throw-bar').hidden = throwables.length === 0;
  if (signature === throwSignature) return;
  throwSignature = signature;
  $('throw-bar').replaceChildren(...throwables.map((id) => {
    const item = findItem(id);
    const button = el('button', { type: 'button', class: 'btn btn-primary' }, `${item.icon} Ném ${item.name.toLowerCase()}`);
    button.addEventListener('click', async () => {
      button.disabled = true;
      setTimeout(() => { button.disabled = false; }, RULES.throwCooldownMs);
      navigator.vibrate?.(30);
      const reply = await request('race:throw', { item: id });
      if (reply.error) toast(reply.error);
    });
    return button;
  }));
}

// ---------- emoji reactions (everyone, while a race is on) ----------
$('react-bar').append(...REACTIONS.map((emoji) => el('button', {
  type: 'button',
  'aria-label': `Thả ${emoji}`,
  onclick: () => {
    navigator.vibrate?.(10);
    request('race:react', { emoji }); // cooldown errors are ignored: spamming just does nothing
  },
}, emoji)));

// ---------- "Bấm để chạy": the big button (and Space on a keyboard) ----------
const tapPad = $('tap-pad');
const tapReady = () => !tapPad.hidden && !tapPad.disabled;
function tap() {
  if (!tapReady()) return;
  socket.emit('race:tap'); // fire and forget: the server counts at most RULES.tapMaxRate a second
  navigator.vibrate?.(8);
  tapPad.classList.add('down');
  setTimeout(() => tapPad.classList.remove('down'), 70);
}
tapPad.addEventListener('pointerdown', (event) => {
  event.preventDefault(); // no double-tap zoom, no focus ring flicker
  tap();
});
tapPad.addEventListener('contextmenu', (event) => event.preventDefault()); // long press on mobile
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || !tapReady() || event.target.closest?.('input, textarea, [contenteditable]')) return;
  event.preventDefault();
  tap();
});

function renderTapPad(player) {
  const race = state.race;
  const mine = race?.racers.find((r) => r.id === myId);
  const show = race?.mode === 'tap' && player.inRace && Boolean(mine) && mine.finishedAt === null
    && (state.phase === 'countdown' || state.phase === 'racing');
  tapPad.hidden = !show;
  $('view-race').classList.toggle('tapping', show);
  if (!show) return;
  const go = state.phase === 'racing' && !race.paused;
  tapPad.disabled = !go;
  $('tap-word').textContent = go ? 'BẤM!' : race.paused ? 'Tạm dừng' : 'Chuẩn bị…';
  const rate = mine.rate ?? 0;
  tapPad.classList.toggle('flat-out', go && rate >= RULES.tapFullRate);
  $('tap-rate').textContent = go
    ? (rate >= RULES.tapFullRate ? `🔥 Tốc lực tối đa · ${rate}/giây` : `⚡ ${rate}/giây · bấm ${RULES.tapFullRate}/giây để chạy hết tốc lực`)
    : 'Bấm liên tục khi có hiệu lệnh để chạy';
}

function rankingRows() {
  const players = new Map(state.players.map((p) => [p.id, p]));
  if (state.results) {
    return state.results.map((r) => ({ id: r.id, rank: r.rank, name: r.name, meta: formatTime(r.timeMs) }));
  }
  const { race } = state;
  return rankRacers(race.racers).map((r, i) => ({
    id: r.id,
    rank: i + 1,
    name: players.get(r.id)?.name ?? '???',
    meta: r.finishedAt !== null ? formatTime(Math.round(r.finishedAt - race.startsAt)) : `${Math.round((r.pos / race.trackLength) * 100)}%`,
  }));
}

let lastRankingPaint = 0;
let rankingHadResults = false;
function renderRace(entering) {
  const now = performance.now();
  const force = entering || Boolean(state.results) !== rankingHadResults;
  rankingHadResults = Boolean(state.results);
  const player = me();
  renderThrowBar(player);
  renderTapPad(player);
  const note = player.inRace ? '' : player.spectator ? '👀 Bạn đang xem với tư cách khán giả' : '⏳ Lượt này đã đủ người — bạn sẽ đua lượt sau';
  $('race-note').hidden = !note;
  $('race-note').textContent = note;
  const mine = state.results?.find((r) => r.id === myId);
  $('result-card').hidden = !mine;
  if (mine) {
    $('result-rank').textContent = `#${mine.rank}`;
    $('result-time').textContent = `${formatTime(mine.timeMs)} · ${state.results.length} người đua`;
  }
  $('ranking-title').textContent = state.results ? 'Kết quả chung cuộc' : 'Bảng xếp hạng trực tiếp';
  if (!force && now - lastRankingPaint < RANKING_REFRESH_MS) return;
  lastRankingPaint = now;
  $('ranking').replaceChildren(
    ...rankingRows().map((row) =>
      el('li', { class: row.id === myId ? 'me' : '' },
        el('span', { class: 'pos' }, String(row.rank)),
        el('span', {}, row.name),
        el('span', { class: 'meta' }, row.meta))),
  );
}

// ---------- chat ----------
let unread = 0;
const chatOpen = () => !$('chat-sheet').hidden;
const setUnread = (n) => {
  unread = n;
  $('chat-badge').hidden = n === 0;
  $('chat-badge').textContent = n > 9 ? '9+' : String(n);
};
const chat = mountChat({
  log: $('chat-log'),
  form: $('chat-form'),
  input: $('chat-input'),
  myId: () => myId,
  onMessage: (m) => {
    if (!chatOpen() && m.author.id !== myId) setUnread(unread + 1);
  },
});
function toggleChat(open) {
  $('chat-sheet').hidden = !open;
  $('chat-fab').setAttribute('aria-expanded', String(open));
  if (open) {
    setUnread(0);
    chat.stickToBottom();
  }
}
$('chat-fab').addEventListener('click', () => toggleChat(!chatOpen()));
wideQuery.addEventListener('change', () => {
  if (!wideQuery.matches) toggleChat(false); // back to the phone layout: chat becomes a sheet again
  render();
});
$('chat-close').addEventListener('click', () => toggleChat(false));

/** Wording that depends on how the room races (tap to run, or random). */
const MODE_TEXT = {
  tap: { eyebrow: 'Đua bấm nút', step: 'Bấm liên tục để chạy', stepNote: 'Ai bấm nhanh về trước 💨', pick: '· chỉ để trang trí, nhân vật nào cũng chạy như nhau' },
  random: { eyebrow: 'Đua ngẫu nhiên', step: 'Xem đua & ném gạch', stepNote: 'Vui thôi, không đổi kết quả 😉', pick: '· tốc độ ngẫu nhiên, như nhau cho mọi nhân vật' },
};
function renderModeText() {
  const text = MODE_TEXT[state.mode] ?? MODE_TEXT.tap;
  $('join-eyebrow').textContent = text.eyebrow;
  $('step-race').textContent = text.step;
  $('step-race-note').textContent = text.stepNote;
  $('pick-note').textContent = text.pick;
}

function render() {
  if (!state) return;
  renderModeText();
  $('map-chip').textContent = `🗺 ${currentMap().name}`;
  const player = me();
  if (player) seenSelf = true;
  if (myId && !player && seenSelf) {
    // We were in the room and now we're gone (kicked or timed out).
    forget();
  }
  // Joined players get the room panel; on wide screens the chat is docked open next to it.
  const wide = wideQuery.matches;
  $('layout').classList.toggle('joined', Boolean(player));
  $('room-panel').hidden = !player;
  if (player) roomPanel.update(state, myId);
  $('chat-fab').hidden = !player || wide;
  if (!player) toggleChat(false);
  else if (wide && !chatOpen()) toggleChat(true);
  if (!myId || !player) {
    if (!welcomed) {
      if (views.welcome.hidden) show('welcome');
      renderWelcome();
      return;
    }
    const entering = views.join.hidden;
    if (entering) show('join');
    renderJoin(entering);
    return;
  }
  raceView.setState(state);
  directSound(state, raceView.clockOffset);
  // While a race is on, everyone watches it live: racers, waiters and spectators.
  if (state.phase !== 'lobby' && state.race) {
    const entering = views.race.hidden;
    if (entering) show('race');
    renderRace(entering);
  } else {
    const entering = views.lobby.hidden;
    if (entering) show('lobby');
    if (entering && wideQuery.matches) $('change-animal').open = true; // plenty of room: show the picker
    renderLobby(player, entering);
  }
}

const RESUME_ATTEMPTS = 3;
async function resume() {
  const token = storage.get();
  if (!token) return;
  for (let attempt = 0; attempt < RESUME_ATTEMPTS; attempt += 1) {
    const reply = await request('player:resume', { token });
    if (reply.ok) {
      myId = reply.playerId;
      return;
    }
    if (reply.expired) {
      storage.clear(); // only forget on an explicit "unknown token"; timeouts keep it for the next reconnect
      return;
    }
  }
}

socket.on('connect', async () => {
  await resume();
  resumed = true;
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
  if (resumed) render();
});

socket.on('connect_error', () => toast('Không kết nối được server — kiểm tra Wi-Fi'));

socket.on('fx', (fx) => {
  raceView.addEffect(fx);
  soundForEffect(fx);
});

socket.on('moved', ({ spectator }) => toast(spectator ? 'Host đã chuyển bạn sang khán giả 👀' : 'Host đã cho bạn vào hàng đua 🏁'));

socket.on('kicked', () => {
  forget();
  toast('Bạn đã bị host mời ra khỏi phòng');
  render();
});

let typingFrame = 0;
$('name-input').addEventListener('input', () => {
  cancelAnimationFrame(typingFrame);
  typingFrame = requestAnimationFrame(() => joinPicker.update(joinAnimal, joinFace(), currentMap()));
});

$('join-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('join-btn');
  button.disabled = true;
  const spectator = document.querySelector('input[name="role"]:checked')?.value === 'watch';
  const reply = await request('player:join', { name: $('name-input').value, animal: joinAnimal, spectator });
  button.disabled = false;
  if (reply.error) return toast(reply.error);
  storage.set(reply.token);
  myId = reply.playerId;
  render();
});

function enterJoin(role) {
  welcomed = true;
  const radio = document.querySelector(`input[name="role"][value="${role}"]`);
  if (radio) radio.checked = true;
  render();
  $('name-input').focus();
}
$('go-play').addEventListener('click', () => enterJoin('race'));
$('go-watch').addEventListener('click', () => enterJoin('watch'));
$('back-welcome').addEventListener('click', () => {
  welcomed = false;
  render();
});

$('role-btn').addEventListener('click', async () => {
  const reply = await request('player:spectator', { spectator: !me()?.spectator });
  if (reply.error) toast(reply.error);
});

$('leave-btn').addEventListener('click', async () => {
  await request('player:leave');
  forget();
  render();
});

// Announcement / maintenance pushed by the server the moment the operator changes it.
socket.on('status', showStatus);
