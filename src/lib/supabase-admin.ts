import 'server-only';
import { createClient } from '@supabase/supabase-js';

import { PLACEHOLDER_URL, PLACEHOLDER_KEY, envUrl, isSupabaseConfigured } from './config';

export { isSupabaseConfigured } from './config';

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (isSupabaseConfigured && !serviceKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is required when Supabase is configured. See README (Full mode).'
  );
}

// Service role bypasses RLS, so every caller must enforce authz first
// (getSessionUserId + src/lib/authz.ts). In demo mode the placeholder client
// is never called: routes check isSupabaseConfigured before any query.
export const supabaseAdmin = createClient(
  isSupabaseConfigured ? envUrl! : PLACEHOLDER_URL,
  isSupabaseConfigured ? serviceKey! : PLACEHOLDER_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);