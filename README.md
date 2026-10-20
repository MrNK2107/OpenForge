# OpenForge

**Turn Ideas into Contributor-Ready Projects in Minutes**

OpenForge is an open source project incubator and contributor matchmaker. Transform raw project ideas into structured, contributor-ready repositories with automated repo generation, smart contributor matching, and built-in task management.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database/Auth**: Supabase
- **UI Icons**: Lucide React

## Features

- **GitHub OAuth** - Sign in with your GitHub account
- **Auto-Generated Repos** - One-click creation with README, CONTRIBUTING.md, issue templates, and CI/CD workflows
- **Smart Matching** - AI-powered matching connects contributors with projects based on skills, availability, and interests
- **Task Management** - Built-in Kanban board with drag-and-drop and GitHub issue sync
- **Project Discovery** - Explore and filter public projects by status, difficulty, and technology

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── auth/           # GitHub OAuth
│   │   ├── projects/      # Project CRUD
│   │   ├── matches/        # Contributor matching
│   │   ├── notifications/ # User notifications
│   │   └── tags/           # Tag taxonomy
│   ├── dashboard/          # User dashboard
│   ├── explore/           # Project discovery
│   ├── create/            # Project creation
│   ├── projects/[id]/     # Project detail
│   │   ├── tasks/         # Kanban board
│   │   └── generate/      # Repo generation
│   ├── matches/           # Personalized matches
│   ├── profile/           # User profile
│   └── notifications/      # Notification center
├── components/            # React components
│   ├── Navbar.tsx
│   ├── ProjectCard.tsx
│   ├── TaskCard.tsx
│   ├── KanbanBoard.tsx
│   ├── MatchCard.tsx
│   └── Skeleton.tsx
├── lib/                    # Utilities
│   ├── supabase.ts        # Supabase client
│   ├── matching.ts        # Match scoring algorithm
│   └── repo-templates.ts  # Repo generation templates
└── types/                 # TypeScript definitions
    └── index.ts
```

## How It Works

1. **Pitch Your Idea** - Submit your project with tech stack, roles needed, and difficulty level
2. **Generate Repo** - One-click creation of GitHub repo with best-practice templates
3. **Match Contributors** - AI-powered matching connects you with contributors based on skills and interests
4. **Build Together** - Manage tasks with Kanban board, track progress, and ship your project

## Data Models

### User
GitHub-sourced profile with skills, roles, and availability settings

### Project
Projects have status lifecycle: `draft` → `seeking` → `active` → `paused` → `archived`

### Task
Tasks have status: `backlog` → `in_progress` → `review` → `done`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## License

MIT