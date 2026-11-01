// Splitting a finishing order into teams: 1st to team 1, 2nd to team 2… round and round, so team sizes
// differ by at most one. Shared by the browser (quick race) and the tests.

/** @returns {string[][]} `count` teams (count is clamped to 1..names.length). */
export function splitTeams(names, count) {
  const n = Math.max(1, Math.min(Math.floor(count) || 1, names.length || 1));
  const teams = Array.from({ length: n }, () => []);
  names.forEach((name, i) => teams[i % n].push(name));
  return teams;
}
