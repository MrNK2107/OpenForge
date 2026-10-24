/**
 * Signed session cookie (server-only).
 *
 * Token format: `<base64url(JSON payload)>.<base64url(HMAC-SHA256(payload, secret))>`
 * Payload: `{ uid: string, exp: number /* unix seconds *\/ }`
 *
 * The secret comes from `SESSION_SECRET` (>= 32 chars). In development, if it is
 * unset, a random per-process secret is generated and a warning is logged
 * (sessions then reset on every server restart). In production a missing or
 * short secret is a hard error: we never fall back to a guessable value.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'of_session';
/** Cookie used before signed sessions existed. Never trusted; only cleared. */
export const LEGACY_USER_COOKIE = 'user_id';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const MIN_SECRET_LENGTH = 32;

export interface SessionPayload {
  uid: string;
  exp: number;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function hmac(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

export function signSession(
  userId: string,
  secret: string,
  { now = Date.now(), ttlSeconds = SESSION_TTL_SECONDS }: { now?: number; ttlSeconds?: number } = {}
): string {
  if (!userId) throw new Error('signSession: userId is required');
  const payload: SessionPayload = { uid: userId, exp: Math.floor(now / 1000) + ttlSeconds };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${b64url(hmac(body, secret))}`;
}

/** Returns the payload if the token is authentic and unexpired, otherwise null. */
export function verifySession(
  token: string | undefined | null,
  secret: string,
  { now = Date.now() }: { now?: number } = {}
): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = hmac(body, secret);
  let given: Buffer;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const { uid, exp } = payload as Partial<SessionPayload>;
  if (typeof uid !== 'string' || !uid || typeof exp !== 'number') return null;
  if (Math.floor(now / 1000) >= exp) return null;
  return { uid, exp };
}

type GlobalWithSecret = typeof globalThis & { __openforgeDevSessionSecret?: string };

/** Resolves the signing secret. Lazy so `next build` does not need it. */
export function getSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.SESSION_SECRET;
  if (configured && configured.length >= MIN_SECRET_LENGTH) return configured;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      `SESSION_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters in production.`
    );
  }

  // Dev/test: one random secret per process, shared across route bundles via globalThis.
  const g = globalThis as GlobalWithSecret;
  if (!g.__openforgeDevSessionSecret) {
    g.__openforgeDevSessionSecret = randomBytes(32).toString('hex');
    console.warn(
      configured
        ? `[openforge] SESSION_SECRET is shorter than ${MIN_SECRET_LENGTH} chars; using a random dev secret instead.`
        : '[openforge] SESSION_SECRET is not set; using a random dev secret. Sessions reset when the server restarts.'
    );
  }
  return g.__openforgeDevSessionSecret;
}

export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

type CookieReader = { get(name: string): { value: string } | undefined };
type CookieWriter = {
  set(name: string, value: string, options: ReturnType<typeof sessionCookieOptions>): unknown;
  delete(name: string): unknown;
};

/** Reads and verifies the session from a cookie store. Never trusts `user_id`. */
export function readSessionUserId(store: CookieReader, secret = getSessionSecret()): string | null {
  return verifySession(store.get(SESSION_COOKIE)?.value, secret)?.uid ?? null;
}

export function writeSessionCookie(store: CookieWriter, userId: string, secret = getSessionSecret()): void {
  store.set(SESSION_COOKIE, signSession(userId, secret), sessionCookieOptions());
  store.delete(LEGACY_USER_COOKIE);
}

export function clearSessionCookie(store: CookieWriter): void {
  store.delete(SESSION_COOKIE);
  store.delete(LEGACY_USER_COOKIE);
}

/** Convenience for route handlers / server actions. */
export async function getSessionUserId(): Promise<string | null> {
  const { cookies } = await import('next/headers');
  return readSessionUserId(await cookies());
}
