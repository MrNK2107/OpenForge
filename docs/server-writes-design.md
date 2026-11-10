# Design note: how the server talks to Supabase

Status: **implemented** (2026-11-10) — option A + token isolation, as recommended below. `src/lib/supabase-admin.ts` (server-only) is used by every API route; tokens live in `user_github_tokens`; `supabase/schema.sql` and `supabase/migrations/2026-11-10_security_lockdown.sql` lock anon down to read-only public data. Remaining operational step: apply the migration to the live DB and rotate existing GitHub tokens.

Original decision logged in `_night_run/2026-10-31/NEEDS_INPUT.md`.

## Current state

- Identity comes from our own GitHub OAuth flow plus an HMAC-signed `of_session` cookie (`src/lib/session.ts`). Supabase Auth is **not** used.
- Every API route uses one client (`src/lib/supabase.ts`) built from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. That anon key is public, because the `NEXT_PUBLIC_` prefix ships it to the browser.
- Authorization is enforced **only in the API routes**: `getSessionUserId()`, `owner_id` filters, and the `canEditProject` / `canViewProject` checks in `src/lib/authz.ts`.
- The RLS policies in `supabase/schema.sql` are written against `auth.uid()`. With our setup `auth.uid()` is always `NULL`, so as written:
  - writes such as `users` insert/update, `projects` insert and `tasks` insert would be rejected;
  - private projects and all tasks would be invisible, even to their owners.

  Because the app has worked against the live DB, the **live policies probably differ from `schema.sql`**: RLS is relaxed or disabled, or anon-write policies were added. I could not verify this (no DB access tonight).

## Problems this causes

1. **GitHub tokens are world-readable (critical, if the live DB matches schema.sql).**
   - `users` has `SELECT USING (true)`, and `users.github_access_token` (scope `repo`) is a column on that table.
   - Anyone holding the public anon key can run `GET <supabase>/rest/v1/users?select=username,github_access_token` and read every user's token.
   - The API no longer returns this column (fixed tonight in `/api/auth/me` and `/api/users/me`), but the direct REST path remains open.
2. **The API can be bypassed for writes.** If the live DB allows anon writes, anyone can call PostgREST directly with the anon key and skip every check in `authz.ts`. Examples: editing another user's project, or inserting tasks into it.
3. **The checked-in schema is out of sync with the live one.** New deployments built from `schema.sql` simply do not work.

## Options

| | Option | What changes | Pros | Cons |
|---|---|---|---|---|
| A | **Service-role key, server-only** | Add `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_`), and a `src/lib/supabase-admin.ts` that starts with `import 'server-only'`. API routes use it. Lock RLS so `anon` has SELECT on public data only and no writes. | Small code change, because routes already do authz. The anon key becomes harmless. Works with our own OAuth and session. | The service role bypasses RLS, so the API checks are the only guard (they are now tested). A leaked service key means full DB compromise. |
| B | **Supabase Auth (GitHub provider)** | Replace our OAuth and session with Supabase Auth. Each request uses a user-JWT client. RLS uses `auth.uid()`. | Real defense in depth, since the DB enforces ownership too. Supabase handles PKCE and state. | Large migration: `users.id` must map to `auth.users.id`, the session code gets replaced, and existing users must be re-linked. The `repo` provider token still has to be stored somewhere safe. |
| C | **Custom Supabase JWTs** | Keep our session. Per request, mint a short-lived JWT (`role: authenticated`, `sub: uid`) signed with the project's JWT secret, and use `getSupabaseWithAuth(jwt)`. RLS uses `auth.uid()`. | RLS enforcement without changing login. | The server must hold the JWT secret. Newer Supabase projects use asymmetric signing keys, which makes the legacy shared secret path deprecated. More moving parts. |

**Do this whatever the option:** move the token out of the readable table.

- Option 1: a `user_github_tokens(user_id pk, token text)` table with RLS enabled and **no policies**, so only the service role can read it.
- Option 2 (minimum): `REVOKE SELECT (github_access_token) ON public.users FROM anon, authenticated;`

Optionally encrypt the token at rest (pgsodium/Vault, or AES-GCM with a server key). Then rotate or revoke the existing tokens: users re-authorize, or revoke via the GitHub OAuth app settings.

## Recommendation

1. **Now: option A plus token isolation.**
   - Smallest change that closes problems 1 and 2. The API-level checks it relies on are now covered by tests (`src/lib/__tests__/authz-routes.test.ts`).
   - Steps:
     1. Add the `server-only` package and `supabase-admin.ts`.
     2. Switch the imports in `src/app/api/**` and `src/lib/{authz,matching}.ts`.
     3. Apply the SQL below.
     4. Set `SUPABASE_SERVICE_ROLE_KEY` in the deploy env.
     5. Keep the anon client only for any future browser-side reads.
2. **Later: option B**, if the app ever needs browser-side Supabase access or realtime. Otherwise A is sufficient.

### Draft SQL (not applied; review against the live DB first)

```sql
-- 1. Token isolation
CREATE TABLE IF NOT EXISTS public.user_github_tokens (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_github_tokens ENABLE ROW LEVEL SECURITY; -- no policies: service role only
INSERT INTO public.user_github_tokens (user_id, token)
  SELECT id, github_access_token FROM public.users WHERE github_access_token IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING;
REVOKE SELECT (github_access_token) ON public.users FROM anon, authenticated;
-- after the code reads from user_github_tokens: ALTER TABLE public.users DROP COLUMN github_access_token;

-- 2. With option A: anon gets read-only access to public data, no writes.
--    Drop any permissive anon INSERT/UPDATE/DELETE policies on the live DB
--    (list them with: SELECT * FROM pg_policies WHERE schemaname = 'public').
```

## Why I did not implement it tonight

- Switching clients changes behavior depending on the live RLS state, which I could not inspect (the rule was no Supabase contact).
- It also needs a new secret in the deploy env.
- The code change is mechanical, but it is not "trivially safe" without that information.
