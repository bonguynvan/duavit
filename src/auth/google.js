import { createHash, randomBytes } from 'node:crypto';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const CLOCK_SKEW_S = 60;

const base64url = (buf) => Buffer.from(buf).toString('base64url');

/** PKCE pair (RFC 7636, S256). */
export function pkcePair() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function authorizationUrl({ clientId, redirectUri, state, challenge }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

/** Swap the authorization code for tokens (server-to-server, with the client secret). */
export async function exchangeCode({ code, verifier, clientId, clientSecret, redirectUri, fetchImpl = fetch }) {
  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.id_token !== 'string') throw new Error(`token exchange failed (${res.status})`);
  return body;
}

/**
 * Validate the ID token's claims and return the identity.
 * The token came straight from Google's token endpoint over TLS in exchange for our
 * client secret, so per OpenID Connect Core 3.1.3.7 the TLS channel authenticates the
 * issuer and the signature check may be skipped; every claim is still checked.
 */
export function identityFromIdToken(idToken, { clientId, nowMs = Date.now() }) {
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('malformed id_token');
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error('malformed id_token');
  }
  const now = Math.floor(nowMs / 1000);
  if (!ISSUERS.has(claims.iss)) throw new Error('wrong issuer');
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(clientId)) throw new Error('wrong audience');
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_S < now) throw new Error('expired id_token');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('missing subject');
  if (claims.email_verified !== true || typeof claims.email !== 'string') throw new Error('email not verified');
  const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim().slice(0, 60) : claims.email.split('@')[0];
  return { sub: claims.sub, email: claims.email.toLowerCase(), name };
}
