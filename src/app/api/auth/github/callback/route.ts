import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { writeSessionCookie } from '@/lib/session';
import { consumeOAuth } from '@/lib/oauth-state';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  if (!isSupabaseConfigured || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) return NextResponse.redirect(new URL("/explore?error=github_not_configured", request.url));
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Single use: the state cookie is cleared on every callback, valid or not.
  const cookieStore = await cookies();
  const check = consumeOAuth(cookieStore, state);
  if (!check.ok) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_state`);
  }
  if (searchParams.get('error') || !code) {
    // e.g. the user clicked "Cancel" on GitHub (error=access_denied).
    return NextResponse.redirect(`${APP_URL}/?error=oauth_denied`);
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${APP_URL}/api/auth/github/callback`,
        code_verifier: check.verifier,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error || typeof tokenData.access_token !== 'string') {
      return NextResponse.redirect(`${APP_URL}/?error=token_failed`);
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(`${APP_URL}/?error=auth_failed`);
    }
    const userData = await userResponse.json();
    if (typeof userData?.id !== 'number' || typeof userData?.login !== 'string') {
      return NextResponse.redirect(`${APP_URL}/?error=auth_failed`);
    }

    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const emails = emailsResponse.ok ? await emailsResponse.json() : [];
      email = (Array.isArray(emails) ? emails : []).find((e: { primary: boolean }) => e.primary)?.email;
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', userData.id)
      .single();

    let userId: string;

    if (existingUser) {
      await supabase
        .from('users')
        .update({
          username: userData.login,
          email,
          avatar_url: userData.avatar_url,
          github_access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .eq('github_id', userData.id);

      userId = existingUser.id;
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          github_id: userData.id,
          username: userData.login,
          email,
          avatar_url: userData.avatar_url,
          github_access_token: accessToken,
          roles: ['contributor'],
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        if (insertError.code === 'PGRST205' || insertError.message.includes('does not exist')) {
          return NextResponse.redirect(`${APP_URL}/?error=db_not_ready`);
        }
        return NextResponse.redirect(`${APP_URL}/?error=insert_failed`);
      }

      userId = newUser.id;
    }

    // Signed, httpOnly session. The GitHub token stays server-side (users table);
    // it is no longer mirrored into a cookie.
    writeSessionCookie(cookieStore, userId);
    cookieStore.delete('github_token');

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${APP_URL}/?error=auth_failed`);
  }
}