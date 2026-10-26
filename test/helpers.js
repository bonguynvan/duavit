/** Deterministic PRNG (mulberry32) so race tests are reproducible. */
export function seededRng(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Always returns the given values in order, then repeats the last one. */
export function fixedRng(...values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
