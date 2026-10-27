import { MAPS } from '/shared/catalog.js';
import { WelcomeParade } from './welcome.js';
import { el } from './ui.js';
import { loadSavedRooms, rememberRoom, saveRooms } from './myRooms.js';
import { track } from './analytics.js';

const $ = (id) => document.getElementById(id);
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

// The hero tours the public maps, one every 10 s (special maps stay opt-in, so they are skipped).
const HERO_MAP_MS = 10_000;
const heroMaps = MAPS.filter((m) => !m.special);
const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const heroMapId = () => (still ? heroMaps[0].id : heroMaps[Math.floor(Date.now() / HERO_MAP_MS) % heroMaps.length].id);
new WelcomeParade($('hero-canvas'), heroMapId).start();

function showError(message) {
  $('create-error').textContent = message;
  $('create-error').hidden = false;
}

// ---------- account (optional: only operators sign in, for /admin) ----------
let me = { user: null, loginEnabled: false, devLogin: false };
const loginUrl = (returnTo) => (me.devLogin ? `/auth/dev?name=Host&returnTo=${encodeURIComponent(returnTo)}` : `/auth/google?returnTo=${encodeURIComponent(returnTo)}`);

function renderAccount() {
  if (!me.user) return $('account').replaceChildren();
  return $('account').replaceChildren(
    el('span', {}, '👋 ', me.user.name),
    me.user.role === 'admin' ? el('a', { class: 'btn btn-ghost', href: '/admin' }, '🛠 Quản trị') : null,
    el('button', { type: 'button', class: 'btn btn-ghost', onclick: logout }, 'Đăng xuất'),
  );
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  location.assign('/');
}

// ---------- "Phòng của tôi": rooms created in this browser, still open ----------
// Only a 404 means closed: a hiccup (5xx, 429, offline) must not drop a live room from the list.
const roomExists = (code) => fetch(`/r/${code}`, { method: 'HEAD' }).then((r) => r.status !== 404).catch(() => true);

async function renderMyRooms() {
  const saved = loadSavedRooms();
  const open = (await Promise.all(saved.map(async (r) => ((await roomExists(r.code)) ? r : null)))).filter(Boolean);
  if (open.length !== saved.length) saveRooms(open); // closed rooms drop off the list
  $('my-rooms').hidden = open.length === 0;
  $('my-rooms-list').replaceChildren(...open.map(({ code }) => el('li', {},
    el('span', { class: 'code' }, code),
    el('small', {}, 'Đang mở'),
    el('a', { class: 'btn btn-primary', href: `/r/${code}/host` }, 'Màn hình host'), // the key is in this browser already
    el('a', { class: 'btn btn-ghost', href: `/r/${code}` }, 'Link người chơi'))));
}

async function createRoom() {
  const button = $('create-room');
  button.disabled = true;
  $('create-error').hidden = true;
  try {
    const res = await fetch('/api/rooms', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    // Only when the operator set ROOMS_REQUIRE_LOGIN=1.
    if (res.status === 401 && me.loginEnabled) return location.assign(loginUrl('/?create=1'));
    if (!res.ok) return showError(body.error ?? 'Không tạo được phòng, thử lại nhé');
    saveRooms(rememberRoom(loadSavedRooms(), body, Date.now()));
    track('room_create');
    // The host link carries the secret key once; host.js stores it and cleans the address bar.
    location.assign(body.hostUrl);
  } catch {
    showError('Không kết nối được máy chủ');
  } finally {
    button.disabled = false;
  }
}

$('create-room').addEventListener('click', createRoom);


$('join-code').addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

$('join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const code = $('join-code').value.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    $('join-code').setCustomValidity('Mã phòng gồm 6 ký tự (không có O, I, L, 0, 1)');
    $('join-code').reportValidity();
    return;
  }
  $('join-code').setCustomValidity('');
  location.assign(`/r/${code}`);
});

// Who is signed in decides the header and whether to finish a create-after-login.
me = await fetch('/api/me').then((r) => r.json()).catch(() => me);
renderAccount();
renderMyRooms();
const params = new URLSearchParams(location.search);
if (params.get('login') === 'cancelled') showError('Bạn đã huỷ đăng nhập.');
if (params.has('create') || params.has('login')) history.replaceState(null, '', '/');
if (params.get('create') === '1' && me.user) createRoom();
