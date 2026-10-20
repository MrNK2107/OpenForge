import { createClient } from '@supabase/supabase-js';

import { PLACEHOLDER_URL, PLACEHOLDER_KEY, envUrl, envKey, isSupabaseConfigured } from './config';

export { hasSupabaseConfig, isSupabaseConfigured } from './config';

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
