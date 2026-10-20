import { createClient } from '@supabase/supabase-js';

// Harmless placeholders so the module can be imported (e.g. during `next build`
// or in demo mode) without real credentials. They are never used for real
// requests: API routes check `isSupabaseConfigured` first and fall back to
// demo data.
const PLACEHOLDER_URL = 'http://localhost:54321';
const PLACEHOLDER_KEY = 'demo-anon-key-placeholder';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  if (url === PLACEHOLDER_URL || key === PLACEHOLDER_KEY) return false;
  return /^https?:\/\//.test(url);
}

export const isSupabaseConfigured = hasSupabaseConfig(envUrl, envKey);

const supabaseUrl = isSupabaseConfigured ? envUrl! : PLACEHOLDER_URL;
const supabaseAnonKey = isSupabaseConfigured ? envKey! : PLACEHOLDER_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
  },
});

export const getSupabaseWithAuth = (accessToken: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
