/**
 * OAuth `state` + PKCE handling for the GitHub login flow (server-only).
 *
 * On /api/auth/github we mint:
 *   - `state`: 32 random bytes (base64url), echoed back by GitHub in the callback.
 *   - `verifier`: PKCE code_verifier, 32 random bytes (base64url, 43 chars).
 *   - `challenge`: base64url(SHA-256(verifier)), sent with code_challenge_method=S256.
 *
 * Both secrets go into ONE short-lived cookie (`of_oauth`) that is HMAC-signed with
 * the session secret, so it cannot be forged or planted by a sibling subdomain.
 * The cookie is httpOnly, sameSite=lax, secure in production, scoped to
 * /api/auth/github, and expires after OAUTH_STATE_TTL_SECONDS (both via max-age
 * and an `exp` inside the signed payload).
 *
 * The callback must clear the cookie before doing anything else (single use) and
 * compare `state` in constant time.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSessionSecret } from './session';

export const OAUTH_COOKIE = 'of_oauth';
/** Cookie name used before this module existed. Never trusted; only cleared. */
export const LEGACY_OAUTH_COOKIE = 'oauth_state';
export const OAUTH_COOKIE_PATH = '/api/auth/github';
export const OAUTH_STATE_TTL_SECONDS = 60 * 5;

interface OAuthCookiePayload {
  s: string; // state
  v: string; // PKCE code_verifier
  exp: number; // unix seconds
}

export interface OAuthStart {
  state: string;
  verifier: string;
  challenge: string;
  cookieValue: string;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const hmac = (data: string, secret: string) =>
  createHmac('sha256', secret).update(`oauth:${data}`).digest();

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** RFC 7636 S256 code challenge. */
export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Constant-time string comparison (hashes first so length differences don't leak or throw). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

export function createOAuthStart(
  secret: string,
  { now = Date.now(), ttlSeconds = OAUTH_STATE_TTL_SECONDS }: { now?: number; ttlSeconds?: number } = {}
): OAuthStart {
  const state = randomToken();
  const verifier = randomToken();
  const payload: OAuthCookiePayload = { s: state, v: verifier, exp: Math.floor(now / 1000) + ttlSeconds };
  const body = b64url(JSON.stringify(payload));
  return { state, verifier, challenge: pkceChallenge(verifier), cookieValue: `${body}.${b64url(hmac(body, secret))}` };
}

export type OAuthCheck =
  | { ok: true; verifier: string }
  | { ok: false; reason: 'missing_cookie' | 'missing_state' | 'bad_cookie' | 'expired' | 'state_mismatch' };

/** Validates the callback `state` against the signed cookie. Returns the PKCE verifier on success. */
export function checkOAuthCallback(
  cookieValue: string | undefined | null,
  state: string | undefined | null,
  secret: string,
  { now = Date.now() }: { now?: number } = {}
): OAuthCheck {
  if (!cookieValue) return { ok: false, reason: 'missing_cookie' };
  if (!state) return { ok: false, reason: 'missing_state' };

  const parts = cookieValue.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'bad_cookie' };
  const [body, sig] = parts;
  const expected = hmac(body, secret);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_cookie' };

  let payload: Partial<OAuthCookiePayload>;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'bad_cookie' };
  }
  if (!payload || typeof payload.s !== 'string' || typeof payload.v !== 'string' || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'bad_cookie' };
  }
  if (Math.floor(now / 1000) >= payload.exp) return { ok: false, reason: 'expired' };
  if (!safeEqual(payload.s, state)) return { ok: false, reason: 'state_mismatch' };
  return { ok: true, verifier: payload.v };
}

export function oauthCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_STATE_TTL_SECONDS,
  };
}

type CookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: ReturnType<typeof oauthCookieOptions>): unknown;
  delete(opts: { name: string; path?: string }): unknown;
};

/** Mints state/PKCE and stores the signed cookie. */
export function beginOAuth(store: CookieStore, secret = getSessionSecret()): OAuthStart {
  const start = createOAuthStart(secret);
  store.set(OAUTH_COOKIE, start.cookieValue, oauthCookieOptions());
  return start;
}

/** Reads, immediately clears (single use) and validates the OAuth cookie. */
export function consumeOAuth(store: CookieStore, state: string | null, secret = getSessionSecret()): OAuthCheck {
  const value = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });
  // The old unsigned cookie was set without a path, which Next defaults to '/'.
  // (Next keys response cookies by name, so one delete per name.)
  store.delete({ name: LEGACY_OAUTH_COOKIE, path: '/' });
  return checkOAuthCallback(value, state, secret);
}
