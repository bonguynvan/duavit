// Site-wide switches set from the operator dashboard: maintenance mode and an announcement banner.
import { sanitizeText } from './text.js';

export const ANNOUNCEMENT_MAX = 200;
const DEFAULTS = { maintenance: false, announcement: null };

export class Settings {
  /** @param {import('node:sqlite').DatabaseSync} db */
  constructor(db) {
    this.q = {
      all: db.prepare('SELECT key, value FROM settings'),
      put: db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    };
    this.current = { ...DEFAULTS };
    this.q.all.all().forEach(({ key, value }) => {
      if (key in DEFAULTS) this.current[key] = JSON.parse(value);
    });
  }

  get() {
    return { ...this.current };
  }

  /**
   * Change some settings. `announcement`: text (trimmed, max 200 visible characters) or null/'' to clear.
   * @returns {{ settings: object } | { error: string }}
   */
  update({ maintenance, announcement } = {}) {
    const next = { ...this.current };
    if (maintenance !== undefined) {
      if (typeof maintenance !== 'boolean') return { error: 'maintenance phải là true/false' };
      next.maintenance = maintenance;
    }
    if (announcement !== undefined) {
      if (announcement === null || announcement === '') next.announcement = null;
      else {
        const text = sanitizeText(announcement, { maxLength: ANNOUNCEMENT_MAX });
        if (!text) return { error: `Thông báo cần có chữ và tối đa ${ANNOUNCEMENT_MAX} ký tự` };
        next.announcement = text;
      }
    }
    Object.entries(next).forEach(([key, value]) => this.q.put.run(key, JSON.stringify(value)));
    this.current = next;
    return { settings: this.get() };
  }
}
