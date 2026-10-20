/**
 * Static demo data served by the API routes when Supabase is not configured
 * (no NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Lets the UI be
 * explored and screenshotted without a live backend. Shapes mirror what the
 * Supabase joins return (tags nested as `{ tag: {...} }`).
 */

const ts = '2026-01-15T10:00:00.000Z';

export const DEMO_USER_ID = 'demo-user';

export const DEMO_TAGS = [
  { id: 't-ts', name: 'typescript', category: 'tech', color: '#3178c6', created_at: ts },
  { id: 't-react', name: 'react', category: 'tech', color: '#61dafb', created_at: ts },
  { id: 't-rust', name: 'rust', category: 'tech', color: '#dea584', created_at: ts },
  { id: 't-py', name: 'python', category: 'tech', color: '#3572a5', created_at: ts },
  { id: 't-ml', name: 'machine-learning', category: 'domain', color: '#a855f7', created_at: ts },
  { id: 't-devtools', name: 'devtools', category: 'domain', color: '#f97316', created_at: ts },
  { id: 't-climate', name: 'climate', category: 'domain', color: '#22c55e', created_at: ts },
  { id: 't-frontend', name: 'frontend', category: 'role', color: '#ec4899', created_at: ts },
  { id: 't-backend', name: 'backend', category: 'role', color: '#14b8a6', created_at: ts },
];

const tag = (name: string) => {
  const t = DEMO_TAGS.find((x) => x.name === name)!;
  return { tag: { id: t.id, name: t.name, color: t.color } };
};

const owner = (n: number, username: string) => ({
  id: `demo-owner-${n}`,
  username,
  avatar_url: null as string | null,
});

export const DEMO_PROJECTS = [
  {
    id: 'demo-forge-cli',
    owner_id: 'demo-owner-1',
    title: 'forge-cli',
    description: 'A fast, zero-config scaffolding CLI written in Rust that bootstraps open-source repos with CI, licenses and contributor docs.',
    status: 'seeking',
    difficulty: 'intermediate',
    scope: 'medium',
    time_commitment: '5 hours/week',
    github_repo_url: null,
    github_repo_id: null,
    template_type: 'cli',
    license: 'MIT',
    is_public: true,
    created_at: '2026-03-02T09:00:00.000Z',
    updated_at: ts,
    owner: owner(1, 'ada'),
    tags: [tag('rust'), tag('devtools')],
    members: [{ user: owner(1, 'ada'), role: 'owner' }],
    roles_needed: [
      { id: 'r1', role_name: 'backend', filled: false },
      { id: 'r2', role_name: 'docs', filled: false },
    ],
    stars_count: 42,
  },
  {
    id: 'demo-carbon-lens',
    owner_id: 'demo-owner-2',
    title: 'Carbon Lens',
    description: 'Open dashboard that turns public grid-emission data into a per-hour "best time to run your workload" signal.',
    status: 'seeking',
    difficulty: 'beginner',
    scope: 'small',
    time_commitment: '3 hours/week',
    github_repo_url: null,
    github_repo_id: null,
    template_type: 'web-app',
    license: 'Apache-2.0',
    is_public: true,
    created_at: '2026-02-18T09:00:00.000Z',
    updated_at: ts,
    owner: owner(2, 'grace'),
    tags: [tag('typescript'), tag('react'), tag('climate')],
    members: [{ user: owner(2, 'grace'), role: 'owner' }, { user: owner(3, 'linus'), role: 'contributor' }],
    roles_needed: [{ id: 'r3', role_name: 'frontend', filled: false }],
    stars_count: 128,
  },
  {
    id: 'demo-tiny-tensor',
    owner_id: 'demo-owner-3',
    title: 'tiny-tensor',
    description: 'An educational autograd engine in ~1k lines of Python, with notebooks that explain every op.',
    status: 'active',
    difficulty: 'advanced',
    scope: 'medium',
    time_commitment: '10 hours/week',
    github_repo_url: null,
    github_repo_id: null,
    template_type: 'library',
    license: 'MIT',
    is_public: true,
    created_at: '2026-01-20T09:00:00.000Z',
    updated_at: ts,
    owner: owner(3, 'linus'),
    tags: [tag('python'), tag('machine-learning')],
    members: [{ user: owner(3, 'linus'), role: 'owner' }],
    roles_needed: [{ id: 'r4', role_name: 'python', filled: true }],
    stars_count: 311,
  },
];

export const DEMO_TASKS = [
  { id: 'task-1', project_id: 'demo-forge-cli', title: 'Add `--license` flag', description: 'Let users pick a license interactively.', status: 'backlog', difficulty: 'beginner', labels: ['good first issue'], assignee_id: null, github_issue_url: null, github_issue_number: null, effort_estimate: 'S', due_date: null, created_by: 'demo-owner-1', created_at: ts, updated_at: ts },
  { id: 'task-2', project_id: 'demo-forge-cli', title: 'Generate GitHub Actions workflow', description: null, status: 'in_progress', difficulty: 'intermediate', labels: ['ci'], assignee_id: null, github_issue_url: null, github_issue_number: null, effort_estimate: 'M', due_date: null, created_by: 'demo-owner-1', created_at: ts, updated_at: ts },
  { id: 'task-3', project_id: 'demo-forge-cli', title: 'Write CONTRIBUTING.md template', description: null, status: 'done', difficulty: 'beginner', labels: ['docs'], assignee_id: null, github_issue_url: null, github_issue_number: null, effort_estimate: 'S', due_date: null, created_by: 'demo-owner-1', created_at: ts, updated_at: ts },
];

/** Skills used to compute demo matches. */
export const DEMO_USER_SKILLS = ['typescript', 'react', 'frontend', 'rust'];
export const DEMO_USER_AVAILABILITY = '5-10 hours/week';

export function demoProjectsFiltered(opts: { status?: string | null; difficulty?: string | null; search?: string | null }) {
  const q = opts.search?.toLowerCase().trim();
  return DEMO_PROJECTS.filter((p) => {
    if (opts.status && opts.status !== 'all' && p.status !== opts.status) return false;
    if (opts.difficulty && opts.difficulty !== 'all' && p.difficulty !== opts.difficulty) return false;
    if (q && !`${p.title} ${p.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export const DEMO_MODE_ERROR = {
  error: 'Demo mode: Supabase is not configured, so changes are disabled. See README for setup.',
  demo: true,
};
