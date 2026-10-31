import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { beginOAuth } from '@/lib/oauth-state';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!isSupabaseConfigured || !clientId) return NextResponse.redirect(new URL("/explore?error=github_not_configured", request.url));

  // Random state + PKCE verifier in a signed, httpOnly, path-scoped, 5-minute cookie.
  const { state, challenge } = beginOAuth(await cookies());

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${APP_URL}/api/auth/github/callback`,
    scope: 'read:user user:email repo',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
