import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
}));

let fake = createFakeSupabase();
vi.mock('@/lib/supabase-admin', () => ({
  isSupabaseConfigured: true,
  get supabaseAdmin() {
    return fake.client;
  },
}));

const SECRET = 'generate-repo-secret-'.padEnd(48, 'x');
process.env.SESSION_SECRET = SECRET;

const { signSession, SESSION_COOKIE } = await import('@/lib/session');
const { POST } = await import('@/app/api/projects/[id]/generate-repo/route');

const fetchMock = vi.fn();
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request('http://localhost/api/projects/p1/generate-repo', { method: 'POST' });
const as = (uid: string | null) => {
  jar.clear();
  if (uid) jar.set(SESSION_COOKIE, signSession(uid, SECRET));
};

beforeEach(() => {
  fake = createFakeSupabase({
    users: [{ id: 'owner', username: 'octo' }],
    user_github_tokens: [{ user_id: 'owner', token: 'gho_secret' }],
    projects: [
      { id: 'p1', owner_id: 'owner', title: 'My App', description: 'd', template_type: 'web-app', license: 'MIT', status: 'draft' },
    ],
  });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/user/repos')) return Response.json({ id: 7, html_url: 'https://github.com/octo/my-app' });
    return Response.json({});
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/projects/[id]/generate-repo', () => {
  it('reads the GitHub token from user_github_tokens and creates the repo', async () => {
    as('owner');
    const res = await POST(req(), ctx('p1'));
    expect(res.status).toBe(200);
    expect((await res.json()).repo_url).toBe('https://github.com/octo/my-app');

    const createCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/user/repos'))!;
    expect(createCall[1].headers.Authorization).toBe('Bearer gho_secret');
    expect(fake.tables.projects[0]).toMatchObject({ github_repo_url: 'https://github.com/octo/my-app', status: 'seeking' });
  });

  it('401s without a session', async () => {
    as(null);
    expect((await POST(req(), ctx('p1'))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404s for a non-owner and never calls GitHub', async () => {
    fake.tables.users.push({ id: 'stranger', username: 's' });
    fake.tables.user_github_tokens.push({ user_id: 'stranger', token: 'gho_stranger' });
    as('stranger');
    expect((await POST(req(), ctx('p1'))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400s when the owner has no token row', async () => {
    fake.tables.user_github_tokens = [];
    as('owner');
    expect((await POST(req(), ctx('p1'))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});