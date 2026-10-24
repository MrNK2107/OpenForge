import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
}));

const single = vi.fn();
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({ select: () => ({ eq: (_c: string, id: string) => ({ single: () => single(id) }) }) }),
  },
}));

const SECRET = 'route-test-secret-'.padEnd(48, 'x');
process.env.SESSION_SECRET = SECRET;

const { GET: me } = await import('@/app/api/auth/me/route');
const { signSession, SESSION_COOKIE } = await import('@/lib/session');

describe('/api/auth/me with signed sessions', () => {
  beforeEach(() => {
    jar.clear();
    single.mockReset();
    single.mockImplementation(async (id: string) => ({ data: { id, username: 'u' }, error: null }));
  });

  it('401s on the old unsigned user_id cookie (impersonation)', async () => {
    jar.set('user_id', 'victim');
    expect((await me()).status).toBe(401);
    expect(single).not.toHaveBeenCalled();
  });

  it('401s on a forged session cookie', async () => {
    jar.set(SESSION_COOKIE, signSession('victim', 'not-the-secret'.padEnd(48, 'y')));
    expect((await me()).status).toBe(401);
  });

  it('401s on an expired session', async () => {
    jar.set(SESSION_COOKIE, signSession('me', SECRET, { now: Date.now() - 31 * 864e5 }));
    expect((await me()).status).toBe(401);
  });

  it('returns the user for a valid session', async () => {
    jar.set(SESSION_COOKIE, signSession('me', SECRET));
    const res = await me();
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('me');
  });
});
