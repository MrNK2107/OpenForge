# Night run notes (2026-10-20)

Branch: `night-run/2026-10-20` (from `main`). Nothing pushed.

## What changed

1. **Snapshot**: almost all of the app was untracked. It is now committed in logical WIP commits: config, schema/lib/types, API routes, components/assets, pages, docs.
   - `public/assets/hero_object_3d.glb` (70 MB) and `.kilo/` (tool dir with node_modules) are **gitignored, not committed**.
2. **Build config**: standardized on **Tailwind v3**. The code uses v3 syntax (`@tailwind`, `tailwind.config.js`, `tailwindcss` PostCSS plugin), so the unused `@tailwindcss/postcss` v4 dependency was removed. Also removed `framer-motion-3d`, which nothing imports and whose peer dependency (`@react-three/fiber@8`) blocked `npm install`.
3. **Lint**: `next lint` (removed in Next 16) is replaced by `eslint .` with ESLint 9 and the existing flat config. The React Compiler purity/immutability rules are turned off only for the R3F scene files, where mutating three.js objects in `useFrame` is the intended pattern. Result: 0 errors, 12 warnings (mostly `<img>` vs `next/image`).
4. **Tests**: added Vitest with 26 tests covering `matching.ts`, `repo-templates.ts`, `normalize.ts`, Supabase config detection and demo-data filtering.
5. **Bugs fixed**
   - matching: the roles query never selected `filled`, so filled roles still counted as open. `parseInt` on free-text availability could return NaN. Reasons were duplicated.
   - repo templates: the web-app `LICENSE` file was **empty** for any license other than MIT.
   - API returned tags as `{tag:{...}}` while ProjectCard and the detail page read flat `tag.name`, so tag chips rendered blank. Tags are now normalized.
   - The dashboard's `?owner=` filter was ignored. It is now supported, and private projects are shown only to their owner.
   - The search string was interpolated raw into a PostgREST `.or()` filter. Special characters are now stripped.
   - Client pages called `.map` on error payloads (for example `{error}` with a 401 or 500) and crashed. They now go through `fetchJson`/`fetchArray`.
   - The landing page crashed if the GLB or the drei HDR failed to load. An error boundary now falls back to a procedural orb.
   - Dead landing links (`/login`, `/about`, `/how-it-works`) now point to `/dashboard`, `/#about` and `/#how-it-works`.
6. **Demo mode**: with no Supabase env, the API serves sample data, writes return 503, and OAuth redirects back with an error. A banner explains this. `npm run build` needs no credentials.
7. **UI**: added an `(app)` route group whose layout renders the sticky Navbar (the Navbar existed but was never rendered). Also added a demo banner, active nav state, readable tag chips (light colors such as React's cyan were illegible), sign-in empty states, pluralization fixes and mobile filter layout. Aria labels added to icon buttons.

## How to run / test

```bash
npm install
npm test            # vitest: 26/26
npm run typecheck   # clean
npm run lint        # 0 errors
npm run build       # passes
npm run dev
```

## Verified

- `tsc`, `eslint`, `vitest` (26/26) and `next build` all pass. The build passed both with the local `.env` (not read) and with placeholder env values (demo mode).
- I served the production build on port 4783 and took headless Chrome screenshots via Playwright, isolated from the shared MCP browser. Pages checked: `/`, `/explore`, `/matches`, `/dashboard`, `/profile`, `/create`, `/notifications`, `/projects/demo-forge-cli`, `.../tasks` and `.../generate`, at 1366px and 390px.
- All pages return 200, with no horizontal overflow and no page errors. I also checked the landing page with the GLB removed (fallback orb renders).

## Left / ideas

- **Security (important)**: auth identity is an unsigned `user_id` cookie, and all writes use the anon key server-side. Anyone can set the cookie to impersonate another user, and RLS must allow anon writes. Use Supabase Auth sessions, or sign the cookie and use a service-role key server-side.
- The Kanban "Add task" and the star/join actions show no feedback when the API returns 503 in demo mode.
- 7 `<img>` warnings could move to `next/image` (pravatar is already allowed in `next.config.js`).
- The landing page (dark/orange) and the inner app (light/violet) use different visual languages. Unify them on the landing palette.
- The GLB should be compressed (Draco/meshopt) or hosted elsewhere. At 70 MB it is too heavy for the landing page.

---

# Night run notes (2026-10-24): signed sessions

Branch: `night-run/2026-10-24`, branched from `night-run/2026-10-20` (not yet merged). Nothing pushed.

## What changed

- **Impersonation hole closed.** The unsigned `user_id` cookie is no longer trusted anywhere. `src/lib/session.ts` issues an `of_session` cookie: `base64url(JSON{uid,exp}).HMAC-SHA256`. It is verified with `timingSafeEqual`, expires after 30 days, and is httpOnly, `sameSite=lax`, `path=/`, and `secure` in production.
- **Secret.** `SESSION_SECRET` (at least 32 characters) is read from env and is server-only.
  - Production: if the secret is missing, signed-in requests throw (fail closed). Anonymous requests skip verification, so public pages keep working.
  - Dev: a random secret is generated once per process (kept on `globalThis`) and a warning is logged.
  - No secret is committed; `.env.example` has an empty key.
- **Routes.** Every API route reads the user through `getSessionUserId()`. The OAuth callback writes the signed cookie. Logout clears the session cookie and the legacy cookie. The raw GitHub token is no longer copied into a `github_token` cookie (it is already stored server-side).
- **Authorization gaps found and fixed.**
  - `PATCH`/`DELETE /api/projects/[id]` had no auth at all. They now require a session and filter on `owner_id`.
  - Task `POST`/`PUT` now require project owner or member (`src/lib/authz.ts`), and `PUT` is scoped to `project_id`.
- **Client writes.** No client component wrote with `user_id`. All writes were already `fetch` calls to API routes, so no client code needed changes.
- **Tests.** 18 new tests, 44 in total, all passing.
  - `session.test.ts`: round-trip, wrong secret, tampered payload and tampered signature, malformed tokens, expiry, cookie flags, secret policy.
  - `session-routes.test.ts`: calls `/api/auth/me`. It returns 401 for a legacy `user_id` cookie, a forged session or an expired session, and 200 for a valid one.

## Verified

- `tsc`, `eslint` (0 errors, 11 warnings that existed before), `vitest` 44/44, and `next build` all pass.
- I ran `next start` on port 4784 with a throwaway `SESSION_SECRET` set in the process env only, and tested with curl:
  - legacy `user_id` cookie on `/api/auth/me`: 401
  - forged `of_session`: 401
  - validly signed session for an unknown uuid: 404 (it got past auth)
  - forged `PATCH /api/projects/x`: 401
  - anonymous `/api/projects`: 200
- Headless Playwright screenshots of `/explore` and `/dashboard` render correctly.
- **Separate issue:** the Supabase host in local `.env` fails DNS (`ENOTFOUND`). The project may be paused or deleted, so `/explore` shows its empty state after a 7-second wait. My change did not cause this.

## Left

- The user must set `SESSION_SECRET` in the deploy environment (see `NEEDS_INPUT`). Existing users are logged out once, because the old cookies are ignored.
- Server writes still use the anon key. The right long-term fix is a service-role key server-side, or Supabase Auth with RLS.
- The OAuth `state` cookie flow was not changed.
