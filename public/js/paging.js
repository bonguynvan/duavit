// Splitting a list into pages (character picker). Pure, so it is unit-tested.

/**
 * @template T
 * @param {T[]} items
 * @param {number} size items per page
 * @param {number} page requested page (clamped into range)
 * @returns {{ page: number, pages: number, items: T[] }}
 */
export function paginate(items, size, page) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const at = Math.min(pages - 1, Math.max(0, Math.floor(page) || 0));
  return { page: at, pages, items: items.slice(at * size, at * size + size) };
}

/** Page holding the first item that matches, or 0. */
export function pageContaining(items, size, matches) {
  const index = items.findIndex(matches);
  return index < 0 ? 0 : Math.floor(index / size);
}
