// Site-wide banner: the announcement and the maintenance notice, set from the peti.vn admin dashboard.
// Pages poll /api/status; room pages also get instant 'status' pushes over their socket (showStatus).
import { el } from './ui.js';

const POLL_MS = 30000;
const MAINTENANCE_TEXT = '🛠️ Đang bảo trì: tạm thời chưa tạo được phòng mới. Phòng đang chạy vẫn đua bình thường.';

let current = { maintenance: false, announcement: null };
let banner = null;
// Full-screen layouts (the host race view) start below the banner: --status-h is its height.
const setHeight = () => document.documentElement.style.setProperty('--status-h', `${banner?.offsetHeight ?? 0}px`);
const sizeWatch = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setHeight) : null;
const listeners = [];

/** Show (or clear) the banner for a status { maintenance, announcement }. */
export function showStatus(status) {
  current = { maintenance: Boolean(status?.maintenance), announcement: status?.announcement ?? null };
  const lines = [current.announcement && `📢 ${current.announcement}`, current.maintenance && MAINTENANCE_TEXT].filter(Boolean);
  if (lines.length === 0) {
    if (banner) sizeWatch?.unobserve(banner);
    banner?.remove();
    banner = null;
  } else {
    if (!banner) {
      banner = el('div', { class: 'site-status', role: 'status', 'aria-live': 'polite' });
      document.body.prepend(banner);
      sizeWatch?.observe(banner);
    }
    banner.replaceChildren(...lines.map((text) => el('p', {}, text)));
  }
  setHeight();
  listeners.forEach((fn) => fn(current));
}

/** Call `fn` with the current status now and whenever it changes. */
export function onStatus(fn) {
  listeners.push(fn);
  fn(current);
}

async function poll() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (res.ok) showStatus(await res.json());
  } catch {
    // offline for a moment: keep showing what we had
  }
}

poll();
setInterval(poll, POLL_MS);
