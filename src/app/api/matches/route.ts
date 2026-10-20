import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMatchesForUser } from '@/lib/matching';
import { isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_PROJECTS, DEMO_USER_ID, DEMO_USER_SKILLS, DEMO_USER_AVAILABILITY } from '@/lib/demo-data';
import { rankProjectsForUser } from '@/lib/matching';

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json(rankProjectsForUser({ userId: DEMO_USER_ID, skills: DEMO_USER_SKILLS, availability: DEMO_USER_AVAILABILITY }, DEMO_PROJECTS.filter((p) => p.status === 'seeking')));
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const matches = await getMatchesForUser(userId);

  return NextResponse.json(matches);
}