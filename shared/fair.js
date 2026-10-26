// Provably-fair randomness, shared by the server, the browser and the /kiem-chung page.
// A race is fully determined by a secret seed: sha256(seed) is published before the
// start, the seed after the finish, and anyone can re-run the race to check the result.

export const SEED_HEX_LENGTH = 64; // 32 random bytes

/** sfc32: small, fast, well-tested PRNG. Same seed -> same sequence on every platform. */
function sfc32(a, b, c, d) {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const out = (t + d) | 0;
    c = (c + out) | 0;
    return (out >>> 0) / 4294967296;
  };
}

export const isSeed = (seed) => typeof seed === 'string' && new RegExp(`^[0-9a-f]{${SEED_HEX_LENGTH}}$`).test(seed);

/** Deterministic rng () => [0, 1) from a 64-hex-char seed. */
export function rngFromSeed(seed) {
  if (!isSeed(seed)) throw new Error('invalid seed');
  const words = [0, 8, 16, 24].map((i) => parseInt(seed.slice(i, i + 8), 16));
  const rng = sfc32(...words);
  for (let i = 0; i < 15; i += 1) rng(); // warm-up: decorrelate from the raw seed words
  return rng;
}

/** Fresh random seed (Web Crypto: available in browsers and Node 20+). */
export function newSeed() {
  const bytes = new Uint8Array(SEED_HEX_LENGTH / 2);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hex of a string (async: Web Crypto). */
export async function sha256Hex(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
