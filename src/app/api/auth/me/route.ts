import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PUBLIC_USER_COLUMNS } from '@/lib/authz';

import type { User } from '@/types';

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Not authenticated', demo: true }, { status: 401 });
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select(PUBLIC_USER_COLUMNS) // never select('*'): users.github_access_token must not reach the browser
    .eq('id', userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user as User);
}