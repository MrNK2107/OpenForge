-- Security lockdown for EXISTING databases (fresh installs use schema.sql instead).
-- Run once in the Supabase SQL Editor BEFORE deploying the matching code version.
-- Safe to re-run.

-- 1. Token isolation: move GitHub tokens out of the world-readable users table.
CREATE TABLE IF NOT EXISTS public.user_github_tokens (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_github_tokens ENABLE ROW LEVEL SECURITY; -- no policies: service role only

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'github_access_token'
  ) THEN
    INSERT INTO public.user_github_tokens (user_id, token)
      SELECT id, github_access_token FROM public.users WHERE github_access_token IS NOT NULL
      ON CONFLICT (user_id) DO NOTHING;
    ALTER TABLE public.users DROP COLUMN github_access_token;
  END IF;
END $$;

-- 2. Reconcile RLS with the custom-OAuth architecture: auth.uid() is always NULL,
--    so every auth.uid() policy is dead. All access goes through the API routes
--    (service role); anon gets read-only public data and nothing else.
--    The live policy set is unknown, so drop every policy on public tables first.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles_needed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);
CREATE POLICY "Public projects are viewable by everyone" ON public.projects
    FOR SELECT USING (is_public = true);
CREATE POLICY "Tags are viewable by everyone" ON public.tags
    FOR SELECT USING (true);

-- 3. Treat every token copied above as compromised: it was readable by anyone
--    with the anon key. Users must re-authorize (log out, sign in with GitHub)
--    to mint a fresh token; or revoke all grants in the GitHub OAuth app settings.