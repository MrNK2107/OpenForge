import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  checkOAuthCallback,
  consumeOAuth,
  createOAuthStart,
  oauthCookieOptions,
  pkceChallenge,
  safeEqual,
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  OAUTH_STATE_TTL_SECONDS,
  LEGACY_OAUTH_COOKIE,
} from '@/lib/oauth-state';

const SECRET = 'oauth-test-secret-'.padEnd(48, 'z');

describe('oauth state helpers', () => {
  it('mints high-entropy, unique state and verifier', () => {
    const a = createOAuthStart(SECRET);
    const b = createOAuthStart(SECRET);
    expect(a.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/); // RFC 7636: 43..128 chars
    expect(a.state).not.toBe(b.state);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.state).not.toBe(a.verifier);
  });

  it('computes the S256 challenge (RFC 7636 appendix B vector)', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
    const s = createOAuthStart(SECRET);
    expect(s.challenge).toBe(createHash('sha256').update(s.verifier).digest('base64url'));
  });

  it('cookie value is <payload>.<signature>', () => {
    const s = createOAuthStart(SECRET);
    expect(s.cookieValue.split('.')).toHaveLength(2);
  });

  it('accepts the matching state and returns the verifier', () => {
    const s = createOAuthStart(SECRET);
    expect(checkOAuthCallback(s.cookieValue, s.state, SECRET)).toEqual({ ok: true, verifier: s.verifier });
  });

  it('rejects missing cookie / missing state', () => {
    const s = createOAuthStart(SECRET);
    expect(checkOAuthCallback(undefined, s.state, SECRET)).toMatchObject({ ok: false, reason: 'missing_cookie' });
    expect(checkOAuthCallback(s.cookieValue, null, SECRET)).toMatchObject({ ok: false, reason: 'missing_state' });
    expect(checkOAuthCallback(s.cookieValue, '', SECRET)).toMatchObject({ ok: false, reason: 'missing_state' });
  });

  it('rejects a mismatched state (CSRF login)', () => {
    const s = createOAuthStart(SECRET);
    const other = createOAuthStart(SECRET);
    expect(checkOAuthCallback(s.cookieValue, other.state, SECRET)).toMatchObject({ reason: 'state_mismatch' });
    expect(checkOAuthCallback(s.cookieValue, s.state + 'x', SECRET)).toMatchObject({ reason: 'state_mismatch' });
  });

  it('rejects a cookie signed with another secret, tampered or malformed', () => {
    const s = createOAuthStart(SECRET);
    const forged = createOAuthStart('another-secret'.padEnd(48, 'q'));
    expect(checkOAuthCallback(forged.cookieValue, forged.state, SECRET)).toMatchObject({ reason: 'bad_cookie' });

    const [body, sig] = s.cookieValue.split('.');
    const evil = Buffer.from(JSON.stringify({ s: 'attacker', v: 'v', exp: 9e9 })).toString('base64url');
    expect(checkOAuthCallback(`${evil}.${sig}`, 'attacker', SECRET)).toMatchObject({ reason: 'bad_cookie' });
    expect(checkOAuthCallback(`${body}.`, s.state, SECRET)).toMatchObject({ reason: 'bad_cookie' });
    expect(checkOAuthCallback('nodot', s.state, SECRET)).toMatchObject({ reason: 'bad_cookie' });
    expect(checkOAuthCallback(`${body}.${sig}.x`, s.state, SECRET)).toMatchObject({ reason: 'bad_cookie' });
    // The old unsigned format (bare uuid) is not accepted.
    expect(checkOAuthCallback(s.state, s.state, SECRET)).toMatchObject({ reason: 'bad_cookie' });
  });

  it('rejects an expired cookie even if the browser still sends it', () => {
    const now = Date.now();
    const s = createOAuthStart(SECRET, { now });
    const later = now + (OAUTH_STATE_TTL_SECONDS + 1) * 1000;
    expect(checkOAuthCallback(s.cookieValue, s.state, SECRET, { now: later })).toMatchObject({ reason: 'expired' });
  });

  it('safeEqual compares exactly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });

  it('cookie flags: httpOnly, lax, path-scoped, short, secure only in production', () => {
    const dev = oauthCookieOptions({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(dev).toMatchObject({ httpOnly: true, sameSite: 'lax', path: OAUTH_COOKIE_PATH, secure: false });
    expect(dev.maxAge).toBeLessThanOrEqual(600);
    expect(oauthCookieOptions({ NODE_ENV: 'production' } as NodeJS.ProcessEnv).secure).toBe(true);
  });

  it('consumeOAuth clears the cookie (single use) whether or not it is valid', () => {
    const s = createOAuthStart(SECRET);
    const jar = new Map<string, string>([[OAUTH_COOKIE, s.cookieValue], [LEGACY_OAUTH_COOKIE, 'old']]);
    const deleted: Array<{ name: string; path?: string }> = [];
    const store = {
      get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
      set: () => undefined,
      delete: (o: { name: string; path?: string }) => {
        deleted.push(o);
        jar.delete(o.name);
      },
    };
    expect(consumeOAuth(store, 'wrong', SECRET)).toMatchObject({ ok: false });
    expect(deleted).toContainEqual({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });
    expect(jar.size).toBe(0);
    // Replaying the right state afterwards fails: the cookie is gone.
    expect(consumeOAuth(store, s.state, SECRET)).toMatchObject({ ok: false, reason: 'missing_cookie' });
  });
});
