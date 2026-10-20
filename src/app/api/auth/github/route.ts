import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/supabase';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  if (!isSupabaseConfigured || !GITHUB_CLIENT_ID) return NextResponse.redirect(new URL("/explore?error=github_not_configured", request.url));
  const cookieStore = await cookies();
  const state = crypto.randomUUID();
  
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
  });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/github/callback`,
    scope: 'read:user user:email repo',
    state,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}