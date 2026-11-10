import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin';
import { PUBLIC_USER_COLUMNS } from '@/lib/authz';

import type { User } from '@/types';

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Not authenticated', demo: true }, { status: 401 });
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(PUBLIC_USER_COLUMNS) // explicit public columns; the token lives in user_github_tokens (service-role only)
    .eq('id', userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user as User);
}