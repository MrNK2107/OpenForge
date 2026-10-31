import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';

type Opts = Record<string, unknown> | undefined;
const jar = new Map<string, { value: string; opts: Opts }>();
const deletes: Array<{ name: string; path?: string }> = [];
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)!.value } : undefined),
    set: (n: string, v: string, opts?: Opts) => void jar.set(n, { value: v, opts }),
    delete: (o: string | { name: string; path?: string }) => {
      const d = typeof o === 'string' ? { name: o } : o;
      deletes.push(d);
      jar.delete(d.name);
    },
  }),
}));

let fake = createFakeSupabase();
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return fake.client;
  },
}));

process.env.SESSION_SECRET = 'oauth-route-secret-'.padEnd(48, 'x');
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';

const { GET: start } = await import('@/app/api/auth/github/route');
const { GET: callback } = await import('@/app/api/auth/github/callback/route');
const { OAUTH_COOKIE, OAUTH_COOKIE_PATH, LEGACY_OAUTH_COOKIE } = await import('@/lib/oauth-state');
const { SESSION_COOKIE, readSessionUserId } = await import('@/lib/session');

const fetchMock = vi.fn();

function githubOk() {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes('/login/oauth/access_token')) return Response.json({ access_token: 'gho_test' });
    if (url.endsWith('/user')) return Response.json({ id: 42, login: 'octo', email: 'o@example.com', avatar_url: 'a' });
    return Response.json([]);
  });
}

async function begin() {
  const res = await start(new Request('http://localhost:3000/api/auth/github'));
  const loc = new URL(res.headers.get('location')!);
  return { res, loc, state: loc.searchParams.get('state')! };
}

const cb = (qs: string) => callback(new Request(`http://localhost:3000/api/auth/github/callback?${qs}`));

beforeEach(() => {
  jar.clear();
  deletes.length = 0;
  fake = createFakeSupabase({ users: [] });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/auth/github', () => {
  it('redirects to GitHub with random state + S256 PKCE challenge and sets a hardened cookie', async () => {
    const { res, loc, state } = await begin();
    expect(res.status).toBe(307);
    expect(loc.origin + loc.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loc.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const c = jar.get(OAUTH_COOKIE)!;
    expect(c.value).not.toContain(state); // signed + encoded, not the bare state
    expect(c.opts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: OAUTH_COOKIE_PATH, maxAge: 300 });
    expect(jar.has(LEGACY_OAUTH_COOKIE)).toBe(false);
  });

  it('uses a different state on every request', async () => {
    const a = (await begin()).state;
    const b = (await begin()).state;
    expect(a).not.toBe(b);
  });
});

describe('GET /api/auth/github/callback', () => {
  it('rejects a missing state without contacting GitHub, and clears the cookie', async () => {
    await begin();
    const res = await cb('code=abc');
    expect(res.headers.get('location')).toContain('error=invalid_state');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(jar.has(OAUTH_COOKIE)).toBe(false);
    expect(deletes).toContainEqual({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });
  });

  it('rejects a mismatched state', async () => {
    await begin();
    const res = await cb('code=abc&state=attacker-chosen');
    expect(res.headers.get('location')).toContain('error=invalid_state');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects when there is no state cookie (e.g. login CSRF from another browser)', async () => {
    const { state } = await begin();
    jar.clear();
    const res = await cb(`code=abc&state=${state}`);
    expect(res.headers.get('location')).toContain('error=invalid_state');
  });

  it('rejects the legacy unsigned oauth_state cookie', async () => {
    jar.set(LEGACY_OAUTH_COOKIE, { value: 'known', opts: {} });
    const res = await cb('code=abc&state=known');
    expect(res.headers.get('location')).toContain('error=invalid_state');
    expect(jar.has(LEGACY_OAUTH_COOKIE)).toBe(false);
  });

  it('valid state: sends the PKCE verifier, creates a signed session, and is single use', async () => {
    githubOk();
    const { state, loc } = await begin();
    const res = await cb(`code=abc&state=${state}`);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');

    const tokenCall = fetchMock.mock.calls.find(([u]) => String(u).includes('access_token'))!;
    const sent = JSON.parse(tokenCall[1].body);
    expect(sent.code).toBe('abc');
    expect(sent.code_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const { pkceChallenge } = await import('@/lib/oauth-state');
    expect(pkceChallenge(sent.code_verifier)).toBe(loc.searchParams.get('code_challenge'));

    const store = { get: (n: string) => (jar.has(n) ? { value: jar.get(n)!.value } : undefined) };
    expect(readSessionUserId(store)).toBe(fake.tables.users[0].id);
    expect(jar.get(SESSION_COOKIE)!.value).toBeTruthy();
    expect(jar.has(OAUTH_COOKIE)).toBe(false);

    // Replay of the same callback URL fails.
    fetchMock.mockClear();
    const replay = await cb(`code=abc&state=${state}`);
    expect(replay.headers.get('location')).toContain('error=invalid_state');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('user cancelled on GitHub (error=access_denied) does not exchange a code', async () => {
    const { state } = await begin();
    const res = await cb(`error=access_denied&state=${state}`);
    expect(res.headers.get('location')).toContain('error=oauth_denied');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('token endpoint without access_token fails closed', async () => {
    fetchMock.mockImplementation(async () => Response.json({ error: 'bad_verification_code' }));
    const { state } = await begin();
    const res = await cb(`code=abc&state=${state}`);
    expect(res.headers.get('location')).toContain('error=token_failed');
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });
});
