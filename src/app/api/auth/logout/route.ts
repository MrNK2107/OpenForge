import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete('github_token');
  clearSessionCookie(cookieStore);

  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
