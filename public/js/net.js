import { io } from '/socket.io/socket.io.esm.min.js';
import { el } from './ui.js';

/** Room code from the address (/r/K7QX2A, /r/K7QX2A/host, …). */
export const roomCode = location.pathname.match(/^\/r\/([A-Za-z0-9]+)/)?.[1]?.toUpperCase() ?? null;

export const socket = io({ query: { room: roomCode ?? '' }, autoConnect: Boolean(roomCode) });

/** localStorage helpers, namespaced per room so two rooms never share a session or host key. */
export const roomStorage = {
  get(name) {
    try { return localStorage.getItem(`peti.${roomCode}.${name}`); } catch { return null; }
  },
  set(name, value) {
    try { localStorage.setItem(`peti.${roomCode}.${name}`, value); } catch { /* private mode: lost on reload */ }
  },
  remove(name) {
    try { localStorage.removeItem(`peti.${roomCode}.${name}`); } catch { /* ignore */ }
  },
};

// The room was closed (or never existed): replace the page with a clear message.
socket.on('room:closed', () => showRoomGone('Phòng đã được đóng.'));
socket.on('connect_error', (err) => {
  if (err?.message === 'ROOM_NOT_FOUND') showRoomGone(`Phòng ${roomCode} đã đóng hoặc mã phòng không đúng.`);
});

function showRoomGone(message) {
  socket.disconnect();
  document.body.replaceChildren(
    el('main', { class: 'room-missing' },
      el('h1', {}, 'Phòng không tồn tại'),
      el('p', {}, message),
      el('a', { class: 'btn btn-primary', href: '/' }, 'Về trang chủ')),
  );
}

// After the server restarts with a new version, reload so everyone gets the new UI.
let knownBuild = null;
socket.on('hello', ({ build } = {}) => {
  if (knownBuild && build && build !== knownBuild) location.reload();
  knownBuild = build;
});

const REQUEST_TIMEOUT_MS = 5000;

/** Emit with acknowledgement; resolves to the server reply or `{ error }`. */
export function request(event, data = {}) {
  return new Promise((resolve) => {
    socket.timeout(REQUEST_TIMEOUT_MS).emit(event, data, (err, reply) => {
      resolve(err ? { error: 'Mất kết nối tới server' } : reply ?? { error: 'Không có phản hồi' });
    });
  });
}

// Shared DOM helpers live in ui.js (pages without a socket use them too).
export { el, toast, formatTime } from './ui.js';
