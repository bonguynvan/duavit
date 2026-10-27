// Daily counters for the operator dashboard (peti.vn admin): plain numbers per day, never who played.

export const METRICS = ['roomsCreated', 'roomRaces', 'roomRacers', 'quickRaces', 'quickRacers', 'peakPlayers'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day (YYYY-MM-DD) of a timestamp in the given time zone. */
export const dayOf = (ms, timeZone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);

export class DailyStats {
  /** @param {import('node:sqlite').DatabaseSync} db */
  constructor(db, { timeZone = 'Asia/Ho_Chi_Minh' } = {}) {
    this.timeZone = timeZone;
    this.q = {
      add: db.prepare(`INSERT INTO daily_stats (day, metric, value) VALUES (?, ?, ?)
                       ON CONFLICT(day, metric) DO UPDATE SET value = value + excluded.value`),
      peak: db.prepare(`INSERT INTO daily_stats (day, metric, value) VALUES (?, ?, ?)
                        ON CONFLICT(day, metric) DO UPDATE SET value = MAX(value, excluded.value)`),
      since: db.prepare('SELECT day, metric, value FROM daily_stats WHERE day >= ?'),
    };
  }

  #check(metric) {
    if (!METRICS.includes(metric)) throw new Error(`unknown metric ${metric}`);
  }

  /** Count `n` more of `metric` today. */
  add(metric, n, now) {
    this.#check(metric);
    if (n > 0) this.q.add.run(dayOf(now, this.timeZone), metric, Math.round(n));
  }

  /** Remember the highest `value` of `metric` seen today. */
  peak(metric, value, now) {
    this.#check(metric);
    this.q.peak.run(dayOf(now, this.timeZone), metric, Math.round(value));
  }

  /** The last `days` days, oldest first, every metric present (0 when nothing happened). */
  recent(days, now) {
    const list = Array.from({ length: days }, (_, i) => dayOf(now - (days - 1 - i) * DAY_MS, this.timeZone));
    const rows = this.q.since.all(list[0]);
    const byDay = new Map(list.map((day) => [day, Object.fromEntries(METRICS.map((m) => [m, 0]))]));
    rows.forEach(({ day, metric, value }) => {
      const entry = byDay.get(day);
      if (entry && metric in entry) entry[metric] = value;
    });
    return list.map((day) => ({ day, ...byDay.get(day) }));
  }
}
