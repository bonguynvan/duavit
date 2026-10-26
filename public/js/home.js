import { WelcomeParade } from './welcome.js';
import { el } from './ui.js';

const $ = (id) => document.getElementById(id);
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

new WelcomeParade($('hero-canvas'), () => 'meadow').start();

function showError(message) {
  $('create-error').textContent = message;
  $('create-error').hidden = false;
}

// ---------- account ----------
let me = { user: null, loginEnabled: false, devLogin: false };
const loginUrl = (returnTo) => (me.devLogin ? `/auth/dev?name=Host&returnTo=${encodeURIComponent(returnTo)}` : `/auth/google?returnTo=${encodeURIComponent(returnTo)}`);

function renderAccount() {
  const box = $('account');
  if (me.user) {
    box.replaceChildren(
      el('span', {}, '👋 ', me.user.name, ' ', el('small', {}, me.user.email)),
      me.user.role === 'admin' ? el('a', { class: 'btn btn-ghost', href: '/admin' }, '🛠 Quản trị') : null,
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: logout }, 'Đăng xuất'),
    );
    $('login-note').textContent = '';
  } else if (me.loginEnabled) {
    box.replaceChildren(el('a', { class: 'btn', href: loginUrl('/') }, me.devLogin ? 'Đăng nhập thử (dev)' : 'Đăng nhập bằng Google'));
  } else {
    box.replaceChildren();
    $('login-note').textContent = 'Máy chủ chưa bật đăng nhập.';
  }
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  location.assign('/');
}

async function renderMyRooms() {
  if (!me.user) return;
  const { rooms = [] } = await fetch('/api/my-rooms').then((r) => r.json()).catch(() => ({}));
  $('my-rooms').hidden = rooms.length === 0;
  $('my-rooms-list').replaceChildren(...rooms.map((room) => el('li', {},
    el('span', { class: 'code' }, room.code),
    el('small', {}, `${room.title || 'Chưa đặt tên'} · ${room.players} người`),
    el('a', { class: 'btn btn-primary', href: room.hostUrl }, 'Màn hình host'),
    el('a', { class: 'btn btn-ghost', href: room.playerUrl }, 'Link người chơi'))));
}

async function createRoom() {
  if (!me.user) {
    if (!me.loginEnabled) return showError('Máy chủ chưa bật đăng nhập nên chưa tạo phòng được.');
    return location.assign(loginUrl('/?create=1')); // come back here and create right away
  }
  const button = $('create-room');
  button.disabled = true;
  $('create-error').hidden = true;
  try {
    const res = await fetch('/api/rooms', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return showError(body.error ?? 'Không tạo được phòng, thử lại nhé');
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

// Who is signed in decides the header, "Phòng của tôi" and whether to finish a create-after-login.
me = await fetch('/api/me').then((r) => r.json()).catch(() => me);
renderAccount();
renderMyRooms();
const params = new URLSearchParams(location.search);
if (params.get('login') === 'cancelled') showError('Bạn đã huỷ đăng nhập.');
if (params.has('create') || params.has('login')) history.replaceState(null, '', '/');
if (params.get('create') === '1' && me.user) createRoom();
