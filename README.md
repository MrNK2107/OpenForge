# OpenForge

**Turn Ideas into Contributor-Ready Projects in Minutes**

OpenForge is an open source project incubator and contributor matchmaker. Transform raw project ideas into structured, contributor-ready repositories with automated repo generation, skill-based contributor matching, and built-in task management.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 (PostCSS plugin + `tailwind.config.js`)
- **3D**: three.js + React Three Fiber / drei (landing hero)
- **Database/Auth**: Supabase + GitHub OAuth
- **Testing**: Vitest
- **UI Icons**: Lucide React

## Features

- **GitHub OAuth** - Sign in with your GitHub account
- **Auto-Generated Repos** - One-click creation with README, CONTRIBUTING.md, LICENSE, .gitignore and starter issues
- **Smart Matching** - Weighted matching on skills/tags, difficulty, availability and open roles
- **Task Management** - Built-in Kanban board
- **Project Discovery** - Explore and filter public projects by status, difficulty and text search
- **Demo mode** - Every page works with sample data when no backend is configured

## Getting Started

```bash
npm install
npm run dev          # http://localhost:3000
```

### Demo mode (no backend needed)

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the app runs in **demo mode**:

- API routes serve sample projects, tasks, tags and matches from `src/lib/demo-data.ts`
- every page renders (Explore, Matches, project detail, Kanban board, repo generator preview)
- write endpoints return `503` with a clear message; GitHub sign-in redirects to `/explore?error=github_not_configured`
- an amber banner under the navbar explains this, and sign-in-only pages show a friendly empty state

`npm run build` also succeeds without credentials: the Supabase client falls back to harmless placeholder values and is never called.

### Full mode

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Create a GitHub OAuth app with callback URL `http://localhost:3000/api/auth/github/callback`.
3. Copy `.env.example` to `.env.local` and fill it in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
GITHUB_CLIENT_ID=<oauth app client id>
GITHUB_CLIENT_SECRET=<oauth app client secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3D hero asset

The landing hero loads `public/assets/hero_object_3d.glb` (about 70 MB). It is **gitignored** because of its size. Without it the page still renders: an error boundary swaps in a procedural wireframe orb.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | ESLint CLI (`eslint .`, flat config in `eslint.config.mjs`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (`src/lib/__tests__`) |

## Matching algorithm

`scoreMatch` in `src/lib/matching.ts` is a pure function. It combines up to four weighted signals and divides by the weight actually used, so missing data neither helps nor hurts:

| Signal | Weight | Score |
|---|---|---|
| Skills vs project tags | 0.4 | Jaccard similarity (case-insensitive) |
| Difficulty | 0.2 | 1.0 if equal, 0.5 otherwise |
| Availability vs time commitment | 0.2 | 1.0 if user hours >= project hours, else 0.7 (skipped if unparseable) |
| Open (unfilled) roles | 0.2 | 1.0 if any skill contains a role name, else 0.3 |

`rankProjectsForUser` drops the user's own projects and anything scoring 30 or less, then sorts best first.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # 3D landing page
│   ├── api/                  # API routes (auth, projects, tasks, matches, notifications, tags, users)
│   └── (app)/                # App shell (navbar + demo banner) for inner pages
│       ├── dashboard/        # User dashboard
│       ├── explore/          # Project discovery
│       ├── create/           # Project creation wizard
│       ├── projects/[id]/    # Project detail
│       │   ├── tasks/        # Kanban board
│       │   └── generate/     # Repo generation
│       ├── matches/          # Personalized matches
│       ├── profile/          # User profile
│       └── notifications/    # Notification center
├── components/               # Navbar, ProjectCard, MatchCard, KanbanBoard, TagChip, SignInPrompt, ForgeScene/...
├── lib/
│   ├── config.ts             # Supabase config detection (safe for client components)
│   ├── supabase.ts           # Supabase client
│   ├── matching.ts           # Match scoring + ranking (pure, tested)
│   ├── normalize.ts          # Flatten Supabase join shapes (tested)
│   ├── demo-data.ts          # Sample data for demo mode
│   ├── fetch-json.ts         # Never-throwing client fetch helpers
│   ├── repo-templates.ts     # Repo generation templates (tested)
│   └── __tests__/            # Vitest unit tests
├── store/                    # zustand store
└── types/                    # TypeScript definitions
supabase/schema.sql           # Database schema + RLS policies
```

## Data Models

- **User**: GitHub-sourced profile with skills, roles and availability
- **Project**: status lifecycle `draft` → `seeking` → `active` → `paused` → `archived`
- **Task**: status `backlog` → `in_progress` → `review` → `done`

## License

MIT
