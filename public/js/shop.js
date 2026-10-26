import { ITEMS, RULES } from '/shared/catalog.js';
import { el, request, toast } from './net.js';

/**
 * Free cosmetic accessory shop. Tapping an item toggles it (max RULES.maxItems).
 * @param {HTMLElement} grid
 * @param {HTMLElement} counter
 */
export function createShop(grid, counter) {
  let owned = [];

  const toggle = async (itemId) => {
    const next = owned.includes(itemId) ? owned.filter((id) => id !== itemId) : [...owned, itemId];
    if (next.length > RULES.maxItems) return toast(`Tối đa ${RULES.maxItems} món — bỏ bớt 1 món trước nhé`);
    const reply = await request('player:items', { items: next });
    if (reply.error) toast(reply.error);
  };

  const buttons = ITEMS.map((item) => {
    const button = el('button', { type: 'button', class: 'shop-item', 'aria-pressed': 'false', onclick: () => toggle(item.id) },
      el('span', { class: 'shop-icon', 'aria-hidden': 'true' }, item.icon),
      el('span', {}, item.name),
      item.throwable ? el('small', {}, 'ném được') : null);
    grid.append(button);
    return { item, button };
  });

  return {
    /** @param {string[]} items currently owned item ids */
    update(items) {
      owned = items ?? [];
      buttons.forEach(({ item, button }) => button.setAttribute('aria-pressed', String(owned.includes(item.id))));
      counter.textContent = `${owned.length}/${RULES.maxItems}`;
    },
  };
}
