// Admin dashboard: live rooms + users, close rooms, ban/unban. Server checks the admin role.
import { el, toast } from './ui.js';

const $ = (id) => document.getElementById(id);
const REFRESH_MS = 10000;
const PHASES = { lobby: 'Sảnh chờ', countdown: 'Đếm ngược', racing: 'Đang đua', finished: 'Vừa xong' };
const when = (ms) => new Date(ms).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const minutes = (m) => (m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ ${m % 60} phút`);

let query = '';
let timer = 0;

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
  return data;
}

/** Two-click confirmation without blocking dialogs. */
function confirmButton(label, armedLabel, onConfirm, className = 'btn btn-danger') {
  let armedUntil = 0;
  const button = el('button', { type: 'button', class: className }, label);
  button.addEventListener('click', async () => {
    if (Date.now() > armedUntil) {
      armedUntil = Date.now() + 3000;
      button.textContent = armedLabel;
      setTimeout(() => { button.textContent = label; }, 3000);
      return;
    }
    button.disabled = true;
    try {
      await onConfirm();
      load();
    } catch (error) {
      toast(error.message);
      button.disabled = false;
    }
  });
  return button;
}

function renderStats(s) {
  const tiles = [
    [s.rooms, 'phòng đang mở'], [s.players, 'người trong phòng'], [s.connections, 'kết nối'],
    [s.users, 'tài khoản'], [s.activeSessions, 'phiên đăng nhập'], [`${s.memoryMb} MB`, 'bộ nhớ'], [minutes(s.uptimeMin), 'đã chạy'],
  ];
  $('stats').replaceChildren(...tiles.map(([value, label]) => el('div', { class: 'stat' }, el('strong', {}, String(value)), el('span', {}, label))));
}

function renderRooms(rooms) {
  $('room-count').textContent = `(${rooms.length})`;
  $('rooms-empty').hidden = rooms.length > 0;
  $('rooms').replaceChildren(...rooms.map((r) => el('tr', {},
    el('td', { class: 'code' }, r.code),
    el('td', {}, r.title || '—'),
    el('td', {}, r.ownerEmail ?? (r.ownerId ? `#${r.ownerId}` : 'không đăng nhập')),
    el('td', {}, el('span', { class: `pill ${r.phase}` }, PHASES[r.phase] ?? r.phase)),
    el('td', {}, String(r.players)),
    el('td', {}, String(r.connections)),
    el('td', {}, minutes(r.ageMin)),
    el('td', {}, el('div', { class: 'actions' },
      el('a', { class: 'btn btn-ghost', href: `/r/${r.code}/host`, target: '_blank', rel: 'noopener' }, 'Mở host'),
      confirmButton('Đóng phòng', 'Bấm lần nữa', () => post(`/api/admin/rooms/${r.code}/close`)))))));
}

function renderUsers(users) {
  $('users').replaceChildren(...users.map((u) => el('tr', { class: u.banned ? 'banned' : '' },
    el('td', {}, u.name),
    el('td', {}, u.email),
    el('td', {}, el('span', { class: `pill ${u.role}` }, u.role === 'admin' ? 'admin' : 'người dùng')),
    el('td', {}, String(u.liveRooms)),
    el('td', {}, when(u.last_login_at)),
    el('td', {}, u.banned ? el('span', { class: 'pill banned' }, 'đã khóa') : 'hoạt động'),
    el('td', {}, el('div', { class: 'actions' },
      u.role === 'admin'
        ? null
        : u.banned
          ? confirmButton('Mở khóa', 'Bấm lần nữa', () => post(`/api/admin/users/${u.id}/ban`, { banned: false }), 'btn btn-ghost')
          : confirmButton('Khóa', 'Khóa + đóng phòng?', async () => {
            const { closedRooms } = await post(`/api/admin/users/${u.id}/ban`, { banned: true });
            toast(`Đã khóa ${u.email}${closedRooms.length ? `, đóng ${closedRooms.length} phòng` : ''}`);
          }))))));
}

async function load() {
  clearTimeout(timer);
  try {
    const res = await fetch(`/api/admin/overview?q=${encodeURIComponent(query)}`);
    if (res.status === 404) {
      location.assign('/');
      return;
    }
    const data = await res.json();
    renderStats(data.stats);
    renderRooms(data.rooms);
    renderUsers(data.users);
    $('refreshed').textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}`;
  } catch {
    $('refreshed').textContent = 'Mất kết nối, đang thử lại…';
  }
  timer = setTimeout(load, REFRESH_MS);
}

let typing = 0;
$('user-query').addEventListener('input', () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    query = $('user-query').value.trim();
    load();
  }, 300);
});
$('user-search').addEventListener('submit', (event) => event.preventDefault());

load();
