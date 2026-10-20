import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';


const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  if (!isSupabaseConfigured || !GITHUB_CLIENT_ID) return NextResponse.redirect(`${APP_URL}/?error=github_not_configured`);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_state`);
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
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return NextResponse.redirect(`${APP_URL}/?error=token_failed`);
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();

    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const emails = await emailsResponse.json();
      email = emails.find((e: { primary: boolean }) => e.primary)?.email;
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

    cookieStore.set('github_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    cookieStore.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    cookieStore.delete('oauth_state');

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${APP_URL}/?error=auth_failed`);
  }
}