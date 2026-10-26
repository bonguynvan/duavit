// Parse a pasted list / CSV of racer names (quick race). Pure: shared by browser and tests.

export const QUICK_MAX_RACERS = 500;
export const QUICK_NAME_MAX = 30;

const HEADER = /^(t[eê]n|h[oọ] t[eê]n|name|full ?name|player)$/i;
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200c\u200e-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g;

/** First cell of a CSV/TSV line ("Nguyễn A",ghi chú -> Nguyễn A). */
function firstCell(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    return end > 0 ? trimmed.slice(1, end) : trimmed.slice(1);
  }
  return trimmed.split(/[,;\t]/)[0];
}

const clean = (name) => Array.from(name.normalize('NFC').replace(UNSAFE, '').replace(/\s+/g, ' ').trim()).slice(0, QUICK_NAME_MAX).join('').trim();

/**
 * @param {string} text
 * @returns {{ names: string[], dropped: number }} duplicates get " (2)", " (3)"…; `dropped` = over the limit
 */
export function parseNames(text) {
  const raw = String(text ?? '').split(/\r?\n/).map(firstCell).map(clean).filter(Boolean);
  if (raw.length > 0 && HEADER.test(raw[0])) raw.shift();
  const seen = new Map();
  const names = raw.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count === 1 ? name : `${name} (${count})`;
  });
  return { names: names.slice(0, QUICK_MAX_RACERS), dropped: Math.max(0, names.length - QUICK_MAX_RACERS) };
}
