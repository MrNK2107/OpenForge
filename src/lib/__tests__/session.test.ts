import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LEGACY_USER_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearSessionCookie,
  getSessionSecret,
  readSessionUserId,
  sessionCookieOptions,
  signSession,
  verifySession,
  writeSessionCookie,
} from '../session';

const SECRET = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const USER = '11111111-2222-3333-4444-555555555555';

function fakeStore(initial: Record<string, string> = {}) {
  const jar = new Map(Object.entries(initial));
  const setCalls: Array<{ name: string; value: string; options: unknown }> = [];
  return {
    jar,
    setCalls,
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string, options: unknown) => {
      jar.set(name, value);
      setCalls.push({ name, value, options });
    },
    delete: (name: string) => jar.delete(name),
  };
}

describe('signSession / verifySession', () => {
  it('round-trips a valid token', () => {
    const token = signSession(USER, SECRET);
    expect(verifySession(token, SECRET)?.uid).toBe(USER);
  });

  it('rejects a token signed with another secret', () => {
    expect(verifySession(signSession(USER, OTHER), SECRET)).toBeNull();
  });

  it('rejects a tampered payload (impersonation attempt)', () => {
    const token = signSession(USER, SECRET);
    const [, sig] = token.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ uid: 'victim-id', exp: Math.floor(Date.now() / 1000) + 9999 })
    ).toString('base64url');
    expect(verifySession(`${forgedBody}.${sig}`, SECRET)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = signSession(USER, SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(verifySession(flipped, SECRET)).toBeNull();
  });

  it('rejects malformed / empty / raw user-id tokens', () => {
    for (const bad of [undefined, null, '', USER, 'a.b.c', '.', 'abc.', '.abc', '%%%.%%%']) {
      expect(verifySession(bad as string, SECRET)).toBeNull();
    }
  });

  it('expires after the TTL', () => {
    const now = Date.UTC(2026, 0, 1);
    const token = signSession(USER, SECRET, { now, ttlSeconds: 60 });
    expect(verifySession(token, SECRET, { now: now + 59_000 })?.uid).toBe(USER);
    expect(verifySession(token, SECRET, { now: now + 60_000 })).toBeNull();
    expect(verifySession(token, SECRET, { now: now + 3_600_000 })).toBeNull();
  });

  it('defaults to a 30-day expiry', () => {
    const now = Date.UTC(2026, 0, 1);
    const payload = verifySession(signSession(USER, SECRET, { now }), SECRET, { now });
    expect(payload?.exp).toBe(now / 1000 + SESSION_TTL_SECONDS);
  });
});

describe('cookie helpers', () => {
  it('ignores the legacy unsigned user_id cookie', () => {
    const store = fakeStore({ [LEGACY_USER_COOKIE]: USER });
    expect(readSessionUserId(store, SECRET)).toBeNull();
  });

  it('ignores a forged session cookie', () => {
    const store = fakeStore({ [SESSION_COOKIE]: signSession(USER, OTHER) });
    expect(readSessionUserId(store, SECRET)).toBeNull();
  });

  it('writes a signed cookie that reads back, and clears the legacy cookie', () => {
    const store = fakeStore({ [LEGACY_USER_COOKIE]: 'someone-else' });
    writeSessionCookie(store, USER, SECRET);
    expect(store.jar.has(LEGACY_USER_COOKIE)).toBe(false);
    expect(store.jar.get(SESSION_COOKIE)).not.toBe(USER);
    expect(readSessionUserId(store, SECRET)).toBe(USER);
    clearSessionCookie(store);
    expect(readSessionUserId(store, SECRET)).toBeNull();
  });

  it('uses httpOnly + sameSite=lax, and secure only in production', () => {
    const dev = sessionCookieOptions({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    const prod = sessionCookieOptions({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);
    expect(dev).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
    expect(prod.secure).toBe(true);
  });
});

describe('getSessionSecret', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses SESSION_SECRET when long enough', () => {
    expect(getSessionSecret({ SESSION_SECRET: SECRET, NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(SECRET);
  });

  it('throws in production when missing or too short', () => {
    expect(() => getSessionSecret({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(/SESSION_SECRET/);
    expect(() => getSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow();
  });

  it('generates a stable random secret in development and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    delete (globalThis as { __openforgeDevSessionSecret?: string }).__openforgeDevSessionSecret;
    const a = getSessionSecret({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    const b = getSessionSecret({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
