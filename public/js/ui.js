// DOM helpers shared by every page (no network code here).

/** Tiny DOM helper: el('div', { class: 'x' }, child, 'text'). Text is never parsed as HTML. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (key === 'style') Object.assign(node.style, value); // CSSOM: allowed by our CSP
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

export function toast(message) {
  const box = el('div', { class: 'toast', role: 'status' }, message);
  document.body.append(box);
  setTimeout(() => box.remove(), 2600);
}

export const formatTime = (ms) => (ms === null ? 'Chưa về đích' : `${(ms / 1000).toFixed(2)}s`);
