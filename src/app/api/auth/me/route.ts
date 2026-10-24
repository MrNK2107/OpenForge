import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

import type { User } from '@/types';

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Not authenticated', demo: true }, { status: 401 });
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user as User);
}