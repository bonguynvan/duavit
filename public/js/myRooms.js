// "Phòng của tôi" without accounts: room codes this browser created, kept in localStorage.
// Only the code is stored; the host key already lives in the room's own storage (host.js).

export const MAX_SAVED_ROOMS = 10;
const STORE_KEY = 'peti.myRooms';
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** Newest first, one entry per code, capped. Returns a new list. */
export function rememberRoom(list, { code }, now) {
  return [{ code, createdAt: now }, ...list.filter((r) => r.code !== code)].slice(0, MAX_SAVED_ROOMS);
}

/** Parse what the browser stored; anything malformed is dropped. */
export function parseSavedRooms(raw) {
  let data;
  try {
    data = JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter((r) => r && typeof r === 'object' && CODE.test(r.code))
    .map((r) => ({ code: r.code, createdAt: Number.isFinite(r.createdAt) ? r.createdAt : 0 }))
    .slice(0, MAX_SAVED_ROOMS);
}

export function loadSavedRooms() {
  try {
    return parseSavedRooms(localStorage.getItem(STORE_KEY));
  } catch {
    return []; // storage blocked (private mode)
  }
}

export function saveRooms(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch { /* storage blocked: the list just isn't remembered */ }
}
