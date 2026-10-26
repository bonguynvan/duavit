// Last slot of every map grid: build a map yourself (open source), or ask the author to build one.
import { el } from './ui.js';

const CONTRIBUTE_URL = 'https://github.com/bonguynvan/duavit/blob/main/CONTRIBUTING.md#th%C3%AAm-map';
const REQUEST_MAIL = `mailto:hello@peti.vn?subject=${encodeURIComponent('Đặt làm map Đua Vịt')}`;

export function mapRequestCard() {
  return el('div', { class: 'map-request' },
    el('strong', {}, '🗺️ Muốn map mới?'),
    el('a', { href: CONTRIBUTE_URL, target: '_blank', rel: 'noopener', title: 'Mã nguồn mở: tự vẽ map rồi gửi PR trên GitHub' },
      '🛠️ Tự làm · GitHub'),
    el('a', { href: REQUEST_MAIL, title: 'Gửi ý tưởng map qua hello@peti.vn' },
      '✉️ Nhờ tác giả làm'));
}
