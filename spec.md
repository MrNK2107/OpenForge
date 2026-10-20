# OpenForge - Product Specification

## Vision

OpenForge is the infrastructure layer for open-source project formation. It turns the chaotic, fragmented process of starting and joining open-source projects into a structured, transparent, and self-sustaining system.

**Engineering philosophy:** Every feature is built with deterministic algorithms and first-party integrations. No external AI API dependencies. The intelligence comes from structured data, behavioral signals, and smart engineering -- not from probabilistic API calls that break, cost money, and produce inconsistent results.

---

## Why This Exists

### The problem is real

| Who | Pain | Current workaround |
|-----|------|--------------------|
| **Project starters** | Ideas die because they can't find a team | Post on Reddit/Discord, hope someone sees it |
| **Contributors** | Can't find projects matching their skills | Scroll through "awesome lists", give up |
| **Maintainers** | No visibility into project health or contributor pipeline | Manual spreadsheets, gut feeling |
| **Organizations** | No scalable way to manage open-source programs | Google Sheets + Slack + prayers |

### Why not just use GitHub?

GitHub has pieces (repo templates, Projects, Discussions) but not the *workflow*. There's no structured path from "I have an idea" to "I have a team building it." OpenForge is the formation layer GitHub doesn't have.

---

## Core Architecture Principles

1. **Own the intelligence.** Matching, discovery, and recommendations are powered by algorithms we own and control -- not rented from an API that charges per request.
2. **GitHub-native.** OpenForge extends GitHub, not replaces it. Auth via GitHub. Repos live on GitHub. Issues sync via webhooks. PRs link to tasks.
3. **Data is the moat.** Contribution reputation, project health metrics, and behavioral data compound over time. Competitors can copy features but not the dataset.
4. **API-first.** Every feature is available via REST API. Organizations, bootcamps, and tools can build on top.
5. **Graceful degradation.** Every external dependency (GitHub API, email, webhooks) has a fallback path. The core product works even when integrations fail.

---

## Feature Specification

### 1. Smart Project Creation

Not just a form -- an intelligent guided process that produces a contributor-ready project.

**Workflow:**
1. Creator describes their idea (title, description, tech stack, roles needed, difficulty, time commitment)
2. System generates GitHub repo with best-practice scaffolding
3. Project enters "seeking" status and becomes discoverable
4. Creator gets a shareable project page with task board, team roster, and health metrics

**Templates (file generation, no external services):**
- `web-app` -- Next.js/React full-stack scaffold
- `cli-tool` -- Node.js CLI with commander
- `library` -- npm package with build/test/publish setup
- `api-service` -- Express/Fastify REST API
- `data-project` -- Python data pipeline with notebooks
- `mobile-app` -- React Native starter

Each template generates: README.md, CONTRIBUTING.md, LICENSE, .gitignore, issue templates (bug/feature/good-first-issue), PR template, CI workflow, and 3 starter issues.

**Smart defaults (behavioral, not AI):**
- Auto-suggest tags from description using keyword matching against the tag database
- Pre-fill time commitment based on selected difficulty (beginner = 2-5 hrs, advanced = 10+ hrs)
- Recommend roles based on template type (web-app → Frontend + Backend; library → Docs)
- Show "similar projects" during creation to help creators scope their idea

**Error handling:**
| Failure | Behavior |
|---------|----------|
| GitHub API down during repo creation | Save project as draft, retry button, queue for later |
| Repo name already exists | Auto-append suffix (-v2, -v3), show suggestion |
| User's GitHub token expired | Redirect to re-auth, preserve form state in localStorage |
| Template file generation fails | Show error per file, allow manual edit, continue with partial generation |
| Network timeout mid-creation | Save progress to draft, resume from last step on return |
| User closes browser mid-flow | Auto-save draft to localStorage every 30 seconds |

---

### 2. Contributor Matching Engine

**Deterministic weighted scoring. Same inputs = same outputs. Every time.**

The matching algorithm uses five signals:

| Signal | Weight | How it works |
|--------|--------|--------------|
| **Skill overlap** | 35% | Jaccard similarity between user skills and project tags |
| **Difficulty alignment** | 15% | Exact match = 1.0, adjacent = 0.5, mismatch = 0.2 |
| **Availability fit** | 15% | User hours >= project requirement = 1.0, else 0.7 |
| **Role match** | 15% | User skills intersect with open roles = 1.0, else 0.3 |
| **Activity bonus** | 20% | Recent platform activity (tasks done, logins, stars) normalized 0-1 |

**Filters:**
- Only public projects with status "seeking"
- Exclude user's own projects
- Exclude projects user already joined
- Exclude projects user already declined
- Minimum score threshold: 30/100
- Return top 10 results sorted by score

**Why this works:**
- Deterministic: same inputs always produce same outputs
- Explainable: "Matched because: React, TypeScript, beginner-friendly"
- Fast: runs in <50ms against the full project database
- Free: no API costs, no rate limits, no downtime dependencies
- Transparent: users can see exactly why they matched
- Adaptive: activity bonus means engaged users get better matches over time

**Error handling:**
| Failure | Behavior |
|---------|----------|
| User has no skills set | Show "Complete your profile for better matches" + fall back to popular projects |
| No projects match criteria | Show "No matches right now" with browsable project list + "Get notified" opt-in |
| All matched projects are full (no open roles) | Show as "Waitlisted" matches with "Request to join anyway" option |
| Project status changes during matching | Re-validate status before returning results, skip stale entries |
| User's skills are all niche (no overlap with any project) | Expand search to include adjacent skills (React ↔ JavaScript) via tag hierarchy |

---

### 3. GitHub Integration

**Authentication:**
- GitHub OAuth with scopes: `read:user`, `user:email`, `repo`
- Store access token server-side (encrypted) for repo operations
- Session via HTTP-only cookies (30-day expiry, sliding window)

**Repo Generation:**
- Create repo via GitHub API
- Push template files as individual commits
- Create starter issues from template definitions
- Link repo URL back to OpenForge project

**Webhook Sync:**
- `push` events → update last activity timestamp, increment activity score
- `issues` events → sync to task board (create/update/close tasks)
- `pull_request` events → link PRs to tasks, update status
- `star` events → update star count on project
- HMAC-SHA256 signature verification on all incoming webhooks

**Bidirectional Link:**
- OpenForge project page links to GitHub repo
- GitHub repo gets "Built with OpenForge" badge
- Issues created on OpenForge appear on GitHub
- Tasks on OpenForge can reference GitHub issues

**Skill auto-population from GitHub (smart, not AI):**
- Analyze user's public repos: count language usage by repo count and recent activity
- Map GitHub languages to OpenForge tags (JavaScript → JavaScript, TypeScript → TypeScript)
- Weight by recency: last 6 months of contributions count 3x
- Show as suggested skills, user confirms before saving

**Error handling:**
| Failure | Behavior |
|---------|----------|
| GitHub OAuth fails | Show "Try again" button + "Continue without GitHub" for browse-only mode |
| OAuth token expires mid-session | Detect 401 from GitHub API, trigger silent re-auth if refresh token available, else prompt re-login |
| Repo creation fails (name conflict) | Auto-suggest alternative names (append random suffix), let user pick |
| Repo creation fails (permissions) | Show "Grant repo access" link to GitHub settings |
| File push fails mid-way | Track pushed files, resume from last successful file, show progress bar |
| Webhook delivery fails (GitHub side) | Supabase Edge Function retries with exponential backoff (1min, 5min, 30min, 2hr) |
| Webhook signature invalid | Reject silently, log for security audit |
| Webhook payload malformed | Log raw payload, skip processing, alert admin |
| GitHub API rate limit hit | Queue requests, show "Syncing..." status, retry after rate limit reset (shown in response header) |
| GitHub API fully down | Show cached data with "Last synced: X ago" badge, disable write operations with explanation |
| User deletes repo on GitHub | Detect via next webhook/sync, mark project as "repo missing", offer re-link |
| User revokes OAuth token | Detect via 401, mark GitHub features as unavailable, preserve OpenForge data |

---

### 4. Contribution Reputation System

**The moat. Structured contribution data that compounds over time.**

**Reputation signals (all deterministic, computed from existing data):**
- Tasks completed (weighted by difficulty: beginner=1, intermediate=2, advanced=3)
- PRs merged (bonus for first PR to a project)
- Projects joined (diversity signal)
- Contribution streak (consecutive weeks with at least one activity)
- Mentorship actions (accepting join requests, reviewing PRs, assigning tasks)

**Reputation tiers:**
| Tier | Requirement | Benefits |
|------|-------------|----------|
| Newcomer | 0-2 tasks | Basic matching, limited join requests |
| Contributor | 3-10 tasks | Priority matching, badge on profile |
| Regular | 11-25 tasks | Can mentor, higher visibility in search |
| Core | 26-50 tasks | Can create org projects, featured profile |
| Maintainer | 50+ tasks | Platform governance, early access to features |

**Contribution graph:**
- Visual heatmap (like GitHub) showing daily/weekly activity
- Public profile with stats: projects, tasks, PRs, streaks
- Shareable contribution certificate (markdown export)

**Smart profile enrichment (from GitHub data, not AI):**
- Auto-detect primary languages from public repos
- Calculate "open-source experience score" from contribution history
- Show "suggested skills to add" based on repo analysis
- All suggestions require user confirmation before saving

**Error handling:**
| Failure | Behavior |
|---------|----------|
| Contribution event lost (webhook missed) | Nightly cron job recalculates reputation from task table |
| Reputation calculation fails for a user | Show last known reputation, queue recalculation |
| User disputes reputation score | Show breakdown: "You earned X points from Y tasks, Z PRs" with links |
| Streak broken by platform downtime | Detect outage window, extend streak grace period by outage duration |
| GitHub contribution data unavailable | Fall back to OpenForge-only activity data |

---

### 5. Project Health Metrics

**Computed from real data. No guessing.**

| Metric | Source | Calculation |
|--------|--------|-------------|
| **Activity score** | Commits, PRs, issues in last 30 days | Weighted sum: commits*1 + prs*3 + issues*2 |
| **Response time** | Time from join request to first response | Median of last 10 requests |
| **Task completion rate** | Done tasks / total tasks | Percentage, 0% if no tasks |
| **Contributor retention** | Members still active after 30 days | Active = at least 1 task move in 30 days |
| **Onboarding quality** | % of tasks labeled "good first issue" | Percentage of total tasks |

**Health badge:**
- Thriving (green): activity > 5/week, response < 24h, retention > 60%
- Active (blue): activity > 2/week, response < 72h
- Slow (yellow): activity > 0/week
- Dormant (gray): no activity in 30+ days
- Unknown (gray outline): project < 7 days old

**Trending algorithm (Hacker News-style decay, deterministic):**
```
trending_score = (stars * 2 + members * 3 + recent_commits * 5 + open_roles * 4) / (age_in_hours + 2) ^ 1.8
```
Projects rise fast, decay slowly. A project with 5 stars and 3 commits today beats one with 50 stars from last month.

**Error handling:**
| Failure | Behavior |
|---------|----------|
| GitHub API unavailable for health data | Use OpenForge-only data (tasks, join requests, members) |
| No activity data yet (< 7 days old) | Show "New project" badge instead of health badge |
| Health calculation times out | Show cached health with "Last calculated: X ago" |
| Project has no tasks defined | Task completion rate = N/A, don't count against health |
| All members inactive but project is "active" | Auto-suggest status change to maintainer: "Your project has been inactive for 14 days" |

---

### 6. Discovery Engine

**PostgreSQL full-text search + smart ranking.**

```sql
-- Full-text search on projects
CREATE INDEX idx_projects_search ON projects
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

**Filters:**
- Tech stack (multi-select tags)
- Difficulty (beginner-friendly, intermediate, advanced)
- Status (seeking, active, paused)
- Time commitment (1-2 hrs, 2-5 hrs, 5-10 hrs, 10+ hrs)
- Roles needed (frontend, backend, design, docs, devops)
- Health score (thriving, active, slow)
- Has good first issues (boolean)

**Sort options:**
- Trending (Hacker News-style decay algorithm)
- Newest first
- Most starred
- Best match (uses matching algorithm for logged-in users)
- Most active (health score)
- Most contributors needed (open roles count)

**Personalized feed (behavioral signals, not AI):**
- Weight projects with tags the user has previously starred/joined higher
- Boost projects with roles matching the user's skills
- Deprioritize projects the user already viewed and didn't interact with
- All weights are configurable constants, not trained models

**Error handling:**
| Failure | Behavior |
|---------|----------|
| Search returns zero results | Show "No projects found" + suggest broader filters + link to create |
| Search query too long (> 200 chars) | Truncate silently, show results for truncated query |
| Search query contains special characters | Sanitize input, escape PostgreSQL special chars |
| Full-text index not yet populated | Fall back to ILIKE search (slower but works) |
| Filters produce zero results | Show "No projects match these filters" + "Clear filters" button + result count for each filter removal |
| Trending calculation fails | Fall back to "Most starred" sort |

---

### 7. Task Management

**Kanban board with 4 columns: Backlog, In Progress, Review, Done**

**Task properties:**
- Title, description, status, difficulty, labels
- Assignee (single), created by, due date
- Effort estimate (XS/S/M/L/XL)
- GitHub issue link (bidirectional)

**Task lifecycle:**
1. Creator adds task to backlog
2. Contributor self-assigns or gets assigned
3. Contributor moves to "In Progress"
4. Contributor submits PR, moves to "Review"
5. Maintainer reviews PR, moves to "Done"
6. GitHub issue auto-closes if linked

**Smart task suggestions (template-based, not AI):**
- "Set up development environment" (auto-generated for all templates)
- "Implement basic project structure" (auto-generated)
- "Write initial documentation" (auto-generated)
- Each labeled "good first issue" by default
- Template-specific suggestions: web-app → "Set up routing", library → "Publish to npm"

**Error handling:**
| Failure | Behavior |
|---------|----------|
| Drag-and-drop fails (network error) | Revert UI to previous state, show "Failed to save, retrying..." toast, auto-retry 3x |
| Two users move same task simultaneously | Last-write-wins with optimistic locking, show "Task was updated by X" notification to the other user |
| Task assignee leaves project | Unassign task, move to backlog, notify project owner |
| GitHub issue linked to task gets deleted | Keep task intact, remove GitHub link, show "GitHub issue no longer exists" |
| Task creation fails | Keep form data in modal, show error message, allow retry |
| Due date passes with task incomplete | Show overdue indicator (red badge), send notification to assignee |
| Project deleted with tasks | Cascade delete tasks (handled by DB FK), no orphaned data |

---

### 8. Notification System

**Event-driven. In-app real-time via Supabase Realtime.**

| Event | Notification | Priority |
|-------|-------------|----------|
| New match found | "3 new projects match your skills" | Low |
| Join request received | "Maya wants to join EcoTracker" | High |
| Join request accepted/declined | "You've been accepted to EcoTracker" | High |
| Task assigned | "You've been assigned: Implement auth" | High |
| Task status changed | "Task moved to Review" | Medium |
| PR merged | "Your PR was merged in EcoTracker" | Medium |
| Project status changed | "EcoTracker is now seeking contributors" | Low |
| Contributor joined project | "David joined your project" | Medium |
| Streak at risk | "Your 5-week streak ends tomorrow!" | Medium |

**Delivery:**
- In-app: real-time via Supabase Realtime (Postgres changes)
- Badge count on notification bell
- Mark as read (individual + bulk)
- Email digest: weekly summary of new matches (Phase 2, opt-in)

**Error handling:**
| Failure | Behavior |
|---------|----------|
| Supabase Realtime disconnected | Polling fallback every 30 seconds |
| Notification creation fails | Log event, retry via background job, don't block the triggering action |
| Email delivery fails (Phase 2) | Retry 3x with exponential backoff, then mark as "email failed" in notification record |
| User has 1000+ unread notifications | Paginate (50 per page), auto-archive read notifications older than 90 days |
| Notification payload references deleted data | Show generic notification text, don't crash the UI |

---

### 9. Organization & Cohort Management

**For bootcamps, universities, hackathons, and companies.**

**API endpoints:**
```
POST   /api/orgs                          -- Create organization
GET    /api/orgs/:id                      -- Get org details
GET    /api/orgs/:id/projects             -- List org projects
POST   /api/orgs/:id/cohorts              -- Create cohort
GET    /api/orgs/:id/cohorts              -- List cohorts
POST   /api/orgs/:id/cohorts/:id/members  -- Add members
GET    /api/orgs/:id/analytics            -- Contribution reports
GET    /api/orgs/:id/export               -- Export as CSV/JSON
```

**Use cases:**
- Bootcamp creates cohort, assigns students to projects, tracks completion
- University tracks student contributions for course credit
- Hackathon judges see team project pages with real-time metrics
- Company manages internal open-source programs with contribution reports

**Export formats:**
- CSV: member, project, tasks_completed, prs_merged, contribution_hours, streak
- JSON: raw data for custom integrations
- Markdown: contribution certificate per member

**Error handling:**
| Failure | Behavior |
|---------|----------|
| Org invite email bounces | Show "Invalid email" to admin, allow re-send |
| Member added to non-existent cohort | Return 404 with "Cohort not found" |
| Export fails for large dataset | Stream CSV (don't buffer), show progress indicator |
| Org admin deletes themselves | Transfer ownership to first remaining admin, else prevent deletion |
| Duplicate member in cohort | Return existing membership, don't create duplicate |

---

### 10. Project Forking & Templates

**Not GitHub forks -- project templates with attribution.**

When a user "forks" a project template:
1. New project is created with same tech stack and structure
2. Template files are copied (not linked)
3. Starter tasks are regenerated
4. Original project gets attribution link

**Template marketplace (Phase 3):**
- Community-submitted templates
- Upvote/downvote system
- Usage count and success metrics
- Verified badges for battle-tested templates

**Error handling:**
| Failure | Behavior |
|---------|----------|
| Original project deleted | Template still works (files were copied), show "Original no longer available" |
| Template has broken files | Allow fork but show warning per broken file |
| Forking a fork | Allowed, attribution chain preserved (shows both original and parent) |

---

## Error Handling Philosophy

### Principles

1. **Never block the user.** If a non-critical operation fails (notification, analytics, health metric), log it and move on. The user's primary action (create project, assign task) must complete.
2. **Show what happened, not stack traces.** Every error message is human-readable with a clear next step.
3. **Retry with backoff.** External service failures (GitHub, email) retry 3x with exponential backoff (1s, 5s, 30s).
4. **Degrade gracefully.** If GitHub is down, show cached data. If search fails, fall back to browse. If real-time fails, poll.
5. **Preserve user input.** Form data is never lost on error. Save to localStorage, show the error, let them retry.
6. **Idempotent operations.** All write operations can be safely retried without side effects. Join requests, stars, and task moves use upsert semantics.

### Global error patterns

| Pattern | Implementation |
|---------|---------------|
| API route errors | Return JSON `{ error: string, code: string }` with appropriate HTTP status |
| Client-side errors | Toast notifications for transient errors, inline messages for form errors |
| Database errors | Supabase RLS catches unauthorized access, FK constraints catch orphaned data |
| Network errors | Client retries idempotent GETs automatically, shows "Offline" banner if disconnected |
| Unhandled exceptions | Next.js error boundary catches React errors, shows "Something went wrong" with retry |
| Rate limiting | Client-side debouncing on search/filter, server-side rate limits on write endpoints (100/min/user) |

### Per-feature error matrix

Every feature section above has its own error table. The common thread:

| External dependency | If it fails | Fallback |
|---------------------|-------------|----------|
| GitHub OAuth | Re-auth prompt | Browse-only mode (no create/join) |
| GitHub API (repo ops) | Queue + retry | Draft saved, manual retry button |
| GitHub Webhooks | Retry with backoff | Nightly cron sync as catch-all |
| Supabase Realtime | Poll every 30s | In-app still works, just delayed |
| Email (Phase 2) | Retry 3x | In-app notification always works |
| PostgreSQL | Connection pool handles transient failures | Show "Loading..." state, auto-retry |

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 (App Router) | SSR, API routes, file-based routing |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration |
| Database | Supabase (PostgreSQL) | Auth, RLS, real-time, storage |
| 3D | Three.js + R3F | Landing page visual impact |
| State | Zustand | Lightweight, no boilerplate |
| Animations | Framer Motion | Scroll-driven, performant |
| Icons | Lucide React | Consistent, tree-shakeable |

### Database Schema

11 tables with proper relations, indexes, and RLS policies:

```
users, tags, projects, project_members, project_tags,
project_roles_needed, tasks, project_stars, user_skills,
notifications, join_requests
```

### API Design

14+ REST endpoints, all returning JSON:

```
Auth:         /api/auth/github, /api/auth/me, /api/auth/logout
Projects:     /api/projects, /api/projects/[id], /api/projects/[id]/{join,star,tasks,generate-repo}
Matching:     /api/matches
Notifications:/api/notifications
Tags:         /api/tags
Users:        /api/users/me
Organizations:/api/orgs, /api/orgs/[id]/{cohorts,analytics,export}
```

### Dependencies

| What | How it works | External dependency |
|------|-------------|---------------------|
| Matching | PostgreSQL queries + JS math | None |
| Search | PostgreSQL full-text search | None |
| Repo generation | GitHub API (user's own token) | GitHub (with fallback to draft) |
| Notifications | Supabase Realtime (Postgres changes) | Supabase (with polling fallback) |
| Email | Resend (Phase 2) | Resend (with in-app fallback) |
| Auth | GitHub OAuth | GitHub (with browse-only fallback) |

---

## Feasibility Assessment

### What's already built (MVP)

- [x] GitHub OAuth flow
- [x] Project CRUD with status lifecycle
- [x] 4-step project creation wizard
- [x] Template-based repo generation (4 templates)
- [x] Jaccard similarity matching algorithm
- [x] Kanban task board with drag-and-drop
- [x] Project discovery with search/filters
- [x] Contributor matching page
- [x] Notification center
- [x] User dashboard
- [x] Project detail view with team, tasks, roles
- [x] Database schema with RLS
- [x] Polished landing page with 3D hero
- [x] 14 API endpoints

### What needs to be built

| Feature | Effort | Dependencies |
|---------|--------|-------------|
| GitHub webhook sync | 2-3 days | GitHub App setup |
| Contribution reputation | 3-4 days | Task completion tracking |
| Project health metrics | 2-3 days | GitHub API polling |
| Trending algorithm | 0.5 days | Existing data |
| Organization accounts | 3-4 days | New DB tables, API endpoints |
| Contribution graph | 1-2 days | Existing data |
| Email notifications | 1-2 days | Resend account |
| Skill auto-population from GitHub | 1-2 days | GitHub API |
| Public API docs | 1 day | OpenAPI spec |
| Error handling hardening | 2-3 days | All features |
| Tests (unit + integration) | 3-4 days | Jest/Vitest, Playwright |

### Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cold start (no projects/contributors) | High | Critical | Seed with real OSS projects, partner with bootcamps, org API |
| GitHub API rate limits | Medium | Medium | Cache aggressively, conditional requests, queue + retry |
| GitHub API fully down | Low | High | Cached data, polling fallback, disable write ops with explanation |
| Supabase scaling | Low | Medium | Connection pooling, read replicas, archive old data |
| Competition from GitHub Features | Medium | Medium | Focus on structured workflow GitHub doesn't offer |
| User retention | Medium | High | Contribution streaks, reputation, email digests, notifications |
| Data integrity (orphaned records) | Low | Medium | FK constraints, cascade deletes, nightly consistency check |
| Security (token leakage, injection) | Low | Critical | Encrypted tokens, RLS, input sanitization, CSP headers |

### Cost model

| Item | Cost | Notes |
|------|------|-------|
| Supabase | Free tier (up to 50K rows) | Scales to Pro ($25/mo) |
| Vercel | Free tier (Hobby) | Scales to Pro ($20/mo) |
| GitHub API | Free (5000 req/hr) | With user tokens, effectively unlimited |
| Domain | ~$12/year | .dev or .io |
| Resend (Phase 2) | Free tier (100 emails/day) | Scales to Pro ($20/mo) |
| **Total MVP cost** | **$0/month** | Within free tiers |

---

## What Makes This a 10/10

### 1. Smart without being fragile
The platform feels intelligent -- personalized matches, trending projects, adaptive discovery, smart defaults -- but none of it depends on external AI APIs. If any third-party service goes down, the core product still works.

### 2. Real moat: contribution data
Contribution reputation, project health metrics, and behavioral data compound over time. A competitor can copy the code but not the network of contributors, projects, and organizations.

### 3. Solves the cold start problem
Organization API lets bootcamps, hackathons, and universities onboard both sides of the marketplace simultaneously. Students need projects; projects need contributors.

### 4. GitHub-native, not GitHub-competitive
OpenForge adds the formation layer GitHub lacks. It's a complement, not a competitor. Webhook sync, bidirectional issue linking, skill auto-population from GitHub profiles.

### 5. API-first = ecosystem play
Every feature available via REST API. Organizations can build cohort management, hackathon tracking, and automated student-project matching. The platform becomes infrastructure.

### 6. Zero marginal cost
No per-request AI costs. No vector database hosting. No ML infrastructure. Scales to thousands of users on free tiers.

### 7. Resilient by design
Every external dependency has a fallback. GitHub down? Cached data. Realtime disconnected? Polling. Email failed? In-app notification. The product never fully breaks.

### 8. Clear value for every persona
- **Creators:** "Get a team and a working repo in 3 minutes"
- **Contributors:** "Find projects that match your skills, with transparent reasoning"
- **Organizations:** "Manage your open-source program with real data and exports"
- **Maintainers:** "See your project's health, contributor pipeline, and reputation"

---

## Success Metrics

| Metric | Target (Month 1) | Target (Month 6) |
|--------|------------------|-------------------|
| Projects created | 50 | 500 |
| Contributor matches | 100 | 2,000 |
| Join requests sent | 200 | 5,000 |
| Tasks completed | 300 | 10,000 |
| Org accounts | 3 | 20 |
| API integrations | 1 | 10 |
| Monthly active users | 200 | 5,000 |
| Match-to-join conversion | 15% | 25% |
| Contributor 30-day retention | 30% | 50% |

---

## Competitive Landscape

| Feature | OpenForge | GitHub | Dev.to | Hashnode |
|---------|-----------|--------|--------|----------|
| Project creation wizard | Yes | No | No | No |
| Contributor matching | Yes | No | No | No |
| Task board | Yes | Yes (Projects) | No | No |
| Repo templates | Yes (auto-gen) | Yes (manual) | No | No |
| Contribution reputation | Yes | Partial (contributions graph) | No | No |
| Project health metrics | Yes | Partial (insights) | No | No |
| Organization cohorts | Yes | No | No | No |
| Public API | Yes | Yes | Yes | Yes |
| Discovery/search | Yes | Yes | Yes | Yes |
| Trending algorithm | Yes (decay-based) | No | Yes (reactions) | No |
| GitHub skill sync | Yes | N/A | No | No |
| Graceful degradation | Yes | Yes | Yes | Yes |

**OpenForge's unique position:** The only platform combining project formation, contributor matching, contribution reputation, and structured management -- all with zero external AI dependencies and graceful degradation at every layer.

---

## Appendix A: Matching Algorithm (Full Specification)

```typescript
interface UserSignals {
  skills: string[];          // e.g., ["React", "TypeScript", "Node.js"]
  availability: string;      // e.g., "5-10 hrs/week"
  difficulty: string;        // e.g., "beginner-friendly"
  activityScore: number;     // 0-1, computed from recent platform activity
}

interface ProjectSignals {
  tags: string[];            // e.g., ["React", "TypeScript", "Sustainability"]
  rolesNeeded: string[];     // e.g., ["Frontend", "Docs"]
  difficulty: string;        // e.g., "beginner-friendly"
  timeCommitment: string;    // e.g., "2-5 hrs/week"
  status: string;            // must be "seeking"
  ownerId: string;           // exclude if matches userId
  members: string[];         // exclude if user already joined
}

interface MatchResult {
  score: number;             // 0-100
  reasons: string[];         // e.g., ["React", "TypeScript", "Beginner-friendly"]
  breakdown: {
    skill: number;           // 0-35
    difficulty: number;      // 0-15
    availability: number;    // 0-15
    role: number;            // 0-15
    activity: number;        // 0-20
  };
}

function calculateMatchScore(user: UserSignals, project: ProjectSignals): MatchResult {
  const reasons: string[] = [];

  // 1. Skill overlap (Jaccard similarity) -- 35%
  const userSet = new Set(user.skills.map(s => s.toLowerCase()));
  const projectSet = new Set(project.tags.map(t => t.toLowerCase()));
  const intersection = [...userSet].filter(s => projectSet.has(s));
  const union = new Set([...userSet, ...projectSet]);
  const jaccard = union.size > 0 ? intersection.length / union.size : 0;
  const skillScore = jaccard * 35;
  if (intersection.length > 0) {
    reasons.push(...intersection.map(s => s.charAt(0).toUpperCase() + s.slice(1)));
  }

  // 2. Difficulty alignment -- 15%
  const difficultyMap: Record<string, number> = {
    'beginner-friendly': 1,
    'intermediate': 2,
    'advanced': 3,
  };
  const userDiff = difficultyMap[user.difficulty] || 2;
  const projectDiff = difficultyMap[project.difficulty] || 2;
  const diffDistance = Math.abs(userDiff - projectDiff);
  const diffScore = (diffDistance === 0 ? 15 : diffDistance === 1 ? 7.5 : 3);
  if (diffDistance === 0) reasons.push(project.difficulty);

  // 3. Availability fit -- 15%
  const userHours = parseInt(user.availability?.split('-')[0]) || 0;
  const projectHours = parseInt(project.timeCommitment?.split(' ')[0]) || 0;
  const availScore = userHours >= projectHours ? 15 : 10.5;

  // 4. Role match -- 15%
  const matchingRoles = project.rolesNeeded.filter(role =>
    user.skills.some(s => s.toLowerCase().includes(role.toLowerCase()))
  );
  const roleScore = matchingRoles.length > 0 ? 15 : 4.5;
  if (matchingRoles.length > 0) reasons.push(...matchingRoles);

  // 5. Activity bonus -- 20%
  const activityScore = (user.activityScore || 0) * 20;

  // Final score (0-100)
  const total = skillScore + diffScore + availScore + roleScore + activityScore;

  return {
    score: Math.round(Math.min(100, Math.max(0, total))),
    reasons: reasons.slice(0, 5),
    breakdown: {
      skill: Math.round(skillScore),
      difficulty: Math.round(diffScore),
      availability: Math.round(availScore),
      role: Math.round(roleScore),
      activity: Math.round(activityScore),
    },
  };
}
```

**Complexity:** O(n) where n = number of public seeking projects. Runs in <50ms for 10,000 projects.

---

## Appendix B: Trending Algorithm

```typescript
function calculateTrendingScore(project: {
  stars: number;
  members: number;
  recentCommits: number;  // last 7 days
  openRoles: number;
  createdAt: string;
}): number {
  const rawScore = (project.stars * 2)
    + (project.members * 3)
    + (project.recentCommits * 5)
    + (project.openRoles * 4);

  const ageInHours = (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60);

  // Hacker News-style decay: score decays as project ages
  return rawScore / Math.pow(ageInHours + 2, 1.8);
}
```

---

## Appendix C: Activity Score (User Reputation Input)

```typescript
function calculateActivityScore(userId: string, db: SupabaseClient): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Count recent activities (parallel queries)
  const [tasks, prs, logins, joins] = await Promise.all([
    db.from('tasks').select('id', { count: 'exact' })
      .eq('assignee_id', userId).eq('status', 'done')
      .gte('updated_at', thirtyDaysAgo),
    // PRs merged would come from GitHub webhook data
    db.from('project_members').select('id', { count: 'exact' })
      .eq('user_id', userId).gte('joined_at', thirtyDaysAgo),
    // Login count from session data or a dedicated table
    db.from('project_stars').select('id', { count: 'exact' })
      .eq('user_id', userId).gte('created_at', thirtyDaysAgo),
  ]);

  const raw = (tasks.count || 0) * 3
    + (prs.count || 0) * 5
    + (joins.count || 0) * 2
    + (logins.count || 0) * 1;

  // Normalize to 0-1 (cap at 50 raw points = 1.0)
  return Math.min(1, raw / 50);
}
```
