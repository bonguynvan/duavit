// How much decoration a race gets, by field size (used by RaceView).

/**
 * Side effects scale down as the field grows: in a pack of hundreds nobody can see a puff of dust,
 * and every extra effect costs frame time. `effects`/`items`: how many leaders (plus "me") still get
 * dust, speed lines, "ối!" bubbles / accessories.
 */
export const DETAIL_LEVELS = [
  { upTo: 12, effects: Infinity, items: Infinity, reactions: 40 }, // full show
  { upTo: 100, effects: 20, items: Infinity, reactions: 25 },
  { upTo: Infinity, effects: 0, items: 30, reactions: 15 }, // crowd: the race itself is the show
];
export const detailFor = (racerCount) => DETAIL_LEVELS.find((level) => racerCount <= level.upTo);
