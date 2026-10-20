# OpenForge - Project Context

## Overview

**OpenForge** is an open source project incubator and contributor matchmaker built with Next.js 16. It transforms raw project ideas into structured, contributor-ready repositories with automated repo generation, smart contributor matching, and built-in task management.

## Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom violet theme
- **Database/Auth**: Supabase (GitHub OAuth)
- **UI Icons**: Lucide React
- **Package Manager**: npm

## Core Features

### 1. Authentication
- GitHub OAuth integration (`/api/auth/github`)
- Session management via Supabase
- Protected routes with auth checks

### 2. Project Management
- Create projects with metadata (title, description, difficulty, time commitment)
- Project status lifecycle: draft → seeking → active → paused → archived
- Public/private project visibility
- GitHub repo linking
- License selection

### 3. Contributor Matching
- Jaccard similarity algorithm for skill matching
- Weighted scoring: skills (40%), difficulty (20%), availability (20%), roles (20%)
- Filtered by project status (seeking) and visibility (public)
- Returns top matches with reasoning

### 4. Task Management
- Kanban board with drag-and-drop (backlog, in_progress, review, done)
- Task creation with labels, assignees, due dates
- GitHub issue sync support
- Effort estimation

### 5. User Profiles
- GitHub-sourced avatar, username, bio
- Skills/tags system
- Availability settings

## Data Models

### User
```
id, github_id, username, email, avatar_url, bio, roles[], availability, created_at
```

### Project
```
id, owner_id, title, description, status, difficulty, scope, time_commitment,
github_repo_url, github_repo_id, template_type, license, is_public, created_at
```

### Task
```
id, project_id, title, description, status, difficulty, labels[],
assignee_id, github_issue_url, github_issue_number, effort_estimate, due_date
```

### Tag
```
id, name, category (tech|domain|role|difficulty), color, created_at
```

### Notification
```
id, user_id, type, title, message, payload, read, created_at
```

## Key Files

### Pages (`/src/app/`)
| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, features, trending projects |
| `/dashboard` | User's projects and stats |
| `/explore` | Search/browse public projects with filters |
| `/create` | New project creation form |
| `/projects/[id]` | Project detail view |
| `/projects/[id]/tasks` | Kanban task board |
| `/projects/[id]/generate` | Repo generation interface |
| `/matches` | Personalized contributor matches |
| `/profile` | User profile page |
| `/notifications` | Notification center |

### API Routes (`/src/app/api/`)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/github` | GET | Initiate GitHub OAuth |
| `/api/auth/github/callback` | GET | Handle OAuth callback |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/logout` | POST | Sign out |
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/[id]` | GET, PATCH, DELETE | Project CRUD |
| `/api/projects/[id]/join` | POST | Request to join project |
| `/api/projects/[id]/star` | POST | Star a project |
| `/api/projects/[id]/tasks` | GET, POST | List/create tasks |
| `/api/projects/[id]/generate-repo` | POST | Generate GitHub repo |
| `/api/matches` | GET | Get personalized matches |
| `/api/notifications` | GET, PATCH | List/update notifications |
| `/api/tags` | GET | List available tags |

### Components (`/src/components/`)
- `Navbar` - Top navigation with auth state
- `ProjectCard` - Project preview for grids
- `TaskCard` - Draggable task item
- `KanbanBoard` - 4-column drag-and-drop board
- `MatchCard` - Match result display
- `Skeleton` - Loading placeholder

### Libraries (`/src/lib/`)
- `supabase.ts` - Supabase client with auth helpers
- `matching.ts` - Match scoring algorithm
- `repo-templates.ts` - Repository template definitions

## Repo Template Types

Templates are defined in `repo-templates.ts` and determine the generated GitHub repository structure:
- `blank` - Minimal starting point
- `web-app` - Next.js full-stack app
- `cli-tool` - Command-line interface
- `api-service` - Backend API service
- `mobile-app` - React Native mobile app
- `data-pipeline` - ETL/data processing
- `machine-learning` - ML project with model training
- `open-source-lib` - Publishable npm library

## Design System

### Color Palette
- Primary: Violet (`#7c3aed` / `violet-600`)
- Violet light: `violet-50`, `violet-100`
- Gray scale for neutrals: `gray-50` through `gray-900`
- Semantic: green (success), amber (warning), blue (info), red (error)

### Typography
- Font: Geist (sans) with Geist Mono for code
- Scale: 5xl for hero, 3xl for section titles, xl for page titles, base for body

### Components
- Cards: White background, rounded-xl, subtle shadow on hover
- Buttons: Primary violet, secondary white with border
- Forms: Full-width inputs with focus ring

## Development

```bash
npm run dev     # Start development server
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```