// Control, bidi-override and invisible "filler" characters that can blank out or spoof text.
const UNSAFE_CHARS = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f\u034f\u061c\u115f-\u1160\u200b-\u200c\u200e-\u200f\u2028-\u202e\u2060-\u206f\u3164\ufe00-\ufe0e\ufeff]/g; // keeps ZWJ (200d) + VS16 (fe0f) so emoji stay intact
const HAS_VISIBLE = /[\p{L}\p{N}\p{S}\p{P}]/u;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const MAX_COMBINING_RUN = 2; // stops "Zalgo" text from towering over the screen
const COMBINING_RUN = new RegExp(`(\\p{M}{${MAX_COMBINING_RUN}})\\p{M}+`, 'gu');

/**
 * Normalise user text to a single safe line, or null when empty/too long.
 * @param {unknown} raw
 * @param {{ maxLength: number, requireLetter?: boolean }} opts
 * @returns {string | null}
 */
export function sanitizeText(raw, { maxLength, requireLetter = false }) {
  if (typeof raw !== 'string') return null;
  const text = raw
    .normalize('NFC')
    .replace(/[\t\n\v\f\r]/g, ' ') // line breaks become spaces, not glued words
    .replace(UNSAFE_CHARS, '')
    .replace(COMBINING_RUN, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const visible = requireLetter ? HAS_LETTER_OR_DIGIT : HAS_VISIBLE;
  if (!visible.test(text) || Array.from(text).length > maxLength) return null;
  return text;
}
