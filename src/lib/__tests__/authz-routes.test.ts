import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (o: string | { name: string }) => void jar.delete(typeof o === 'string' ? o : o.name),
  }),
}));

let fake = createFakeSupabase();
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return fake.client;
  },
}));

const SECRET = 'authz-route-secret-'.padEnd(48, 'x');
process.env.SESSION_SECRET = SECRET;

const { signSession, SESSION_COOKIE } = await import('@/lib/session');
const projectRoute = await import('@/app/api/projects/[id]/route');
const tasksRoute = await import('@/app/api/projects/[id]/tasks/route');
const { POST: star } = await import('@/app/api/projects/[id]/star/route');
const { POST: join } = await import('@/app/api/projects/[id]/join/route');
const { GET: me } = await import('@/app/api/auth/me/route');
const { PATCH: patchMe } = await import('@/app/api/users/me/route');
const { PATCH: patchNotification } = await import('@/app/api/notifications/route');

const as = (uid: string | null) => {
  jar.clear();
  if (uid) jar.set(SESSION_COOKIE, signSession(uid, SECRET));
};
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown) =>
  new Request('http://localhost/api/x', { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  fake = createFakeSupabase({
    users: [
      { id: 'owner', username: 'o', github_access_token: 'gho_owner', roles: ['contributor'] },
      { id: 'member', username: 'm', github_access_token: 'gho_member' },
      { id: 'stranger', username: 's', github_access_token: 'gho_stranger' },
    ],
    projects: [
      { id: 'priv', owner_id: 'owner', title: 'Secret', is_public: false, status: 'active' },
      { id: 'pub', owner_id: 'owner', title: 'Open', is_public: true, status: 'seeking' },
      { id: 'old', owner_id: 'owner', title: 'Old', is_public: true, status: 'archived' },
    ],
    project_members: [{ project_id: 'priv', user_id: 'member' }],
    tasks: [
      { id: 't1', project_id: 'priv', title: 'secret task' },
      { id: 't2', project_id: 'pub', title: 'open task' },
    ],
    project_stars: [],
    join_requests: [],
    notifications: [{ id: 'n1', user_id: 'owner', read: false }],
  });
});

describe('private project visibility (read IDOR)', () => {
  it.each([
    [null, 404],
    ['stranger', 404],
    ['member', 200],
    ['owner', 200],
  ])('GET /api/projects/priv as %s -> %i', async (uid, status) => {
    as(uid);
    expect((await projectRoute.GET(req('GET'), ctx('priv'))).status).toBe(status);
  });

  it('public projects stay visible anonymously', async () => {
    as(null);
    expect((await projectRoute.GET(req('GET'), ctx('pub'))).status).toBe(200);
  });

  it('tasks of a private project are hidden from anonymous users and strangers', async () => {
    as(null);
    expect((await tasksRoute.GET(req('GET'), ctx('priv'))).status).toBe(404);
    as('stranger');
    expect((await tasksRoute.GET(req('GET'), ctx('priv'))).status).toBe(404);
    as('member');
    const res = await tasksRoute.GET(req('GET'), ctx('priv'));
    expect(res.status).toBe(200);
    expect((await res.json()).map((t: { id: string }) => t.id)).toEqual(['t1']);
  });
});

describe('project writes (write IDOR)', () => {
  it('PATCH by a non-owner is 404 and changes nothing', async () => {
    as('stranger');
    const res = await projectRoute.PATCH(req('PATCH', { title: 'pwned' }), ctx('pub'));
    expect(res.status).toBe(404);
    expect(fake.tables.projects.find((p) => p.id === 'pub')!.title).toBe('Open');
  });

  it('PATCH rejects an unknown status', async () => {
    as('owner');
    expect((await projectRoute.PATCH(req('PATCH', { status: 'hacked' }), ctx('pub'))).status).toBe(400);
  });

  it('PATCH by the owner works', async () => {
    as('owner');
    const res = await projectRoute.PATCH(req('PATCH', { title: 'Renamed', status: 'active' }), ctx('pub'));
    expect(res.status).toBe(200);
    expect(fake.tables.projects.find((p) => p.id === 'pub')!.title).toBe('Renamed');
  });

  it('DELETE by a non-owner does not archive', async () => {
    as('stranger');
    await projectRoute.DELETE(req('DELETE'), ctx('pub'));
    expect(fake.tables.projects.find((p) => p.id === 'pub')!.status).toBe('seeking');
  });

  it('task PUT by a non-member is 403; without a task id is 400', async () => {
    as('stranger');
    expect((await tasksRoute.PUT(req('PUT', { id: 't2', title: 'x' }), ctx('pub'))).status).toBe(403);
    as('owner');
    expect((await tasksRoute.PUT(req('PUT', { title: 'x' }), ctx('pub'))).status).toBe(400);
  });

  it("task PUT cannot reach another project's task via a project the user owns", async () => {
    fake.tables.projects.push({ id: 'mine', owner_id: 'stranger', is_public: true });
    as('stranger');
    await tasksRoute.PUT(req('PUT', { id: 't1', title: 'pwned' }), ctx('mine'));
    expect(fake.tables.tasks.find((t) => t.id === 't1')!.title).toBe('secret task');
  });
});

describe('star / join', () => {
  it('cannot star a private project you cannot see', async () => {
    as('stranger');
    expect((await star(req('POST'), ctx('priv'))).status).toBe(404);
    expect(fake.tables.project_stars).toHaveLength(0);
    expect((await star(req('POST'), ctx('pub'))).status).toBe(200);
  });

  it('join: private 404, archived 400, normal 201, duplicate 409, own project 400', async () => {
    as('stranger');
    expect((await join(req('POST', {}), ctx('priv'))).status).toBe(404);
    expect((await join(req('POST', {}), ctx('old'))).status).toBe(400);
    expect((await join(req('POST', { message: 'hi' }), ctx('pub'))).status).toBe(201);
    expect((await join(req('POST', {}), ctx('pub'))).status).toBe(409);
    as('owner');
    expect((await join(req('POST', {}), ctx('pub'))).status).toBe(400);
    expect(fake.tables.join_requests).toHaveLength(1);
    expect(fake.tables.join_requests[0]).toMatchObject({ user_id: 'stranger', project_id: 'pub', message: 'hi' });
  });
});

describe('user data', () => {
  it('/api/auth/me never returns the GitHub access token', async () => {
    as('owner');
    const body = await (await me()).json();
    expect(body.id).toBe('owner');
    expect(body).not.toHaveProperty('github_access_token');
  });

  it('PATCH /api/users/me drops unknown roles and does not echo the token', async () => {
    as('owner');
    const res = await patchMe(req('PATCH', { roles: ['mentor', 'admin', 42] }));
    const body = await res.json();
    expect(body.roles).toEqual(['mentor']);
    expect(body).not.toHaveProperty('github_access_token');
    expect(fake.tables.users.find((u) => u.id === 'stranger')!.roles).toBeUndefined();
  });

  it("cannot mark another user's notification as read", async () => {
    as('stranger');
    await patchNotification(req('PATCH', { id: 'n1', read: true }));
    expect(fake.tables.notifications[0].read).toBe(false);
  });
});
