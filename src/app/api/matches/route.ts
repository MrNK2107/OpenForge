import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMatchesForUser } from '@/lib/matching';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const matches = await getMatchesForUser(userId);

  return NextResponse.json(matches);
}