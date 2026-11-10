import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getMatchesForUser } from '@/lib/matching';
import { isSupabaseConfigured } from '@/lib/supabase-admin';
import { DEMO_PROJECTS, DEMO_USER_ID, DEMO_USER_SKILLS, DEMO_USER_AVAILABILITY } from '@/lib/demo-data';
import { rankProjectsForUser } from '@/lib/matching';

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json(rankProjectsForUser({ userId: DEMO_USER_ID, skills: DEMO_USER_SKILLS, availability: DEMO_USER_AVAILABILITY }, DEMO_PROJECTS.filter((p) => p.status === 'seeking')));
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const matches = await getMatchesForUser(userId);

  return NextResponse.json(matches);
}