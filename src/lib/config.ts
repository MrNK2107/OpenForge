/** Supabase configuration detection. Safe to import from client components (no SDK import). */

// Harmless placeholders so the module can be imported (e.g. during `next build`
// or in demo mode) without real credentials. They are never used for real
// requests: API routes check `isSupabaseConfigured` first and fall back to
// demo data.
export const PLACEHOLDER_URL = 'http://localhost:54321';
export const PLACEHOLDER_KEY = 'demo-anon-key-placeholder';

export const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  if (url === PLACEHOLDER_URL || key === PLACEHOLDER_KEY) return false;
  return /^https?:\/\//.test(url);
}

export const isSupabaseConfigured = hasSupabaseConfig(envUrl, envKey);
