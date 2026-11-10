import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin';
import { DEMO_MODE_ERROR } from '@/lib/demo-data';
import { PUBLIC_USER_COLUMNS, USER_ROLES } from '@/lib/authz';


export async function PATCH(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { bio, availability, skills } = body;
  // Only known roles; anything else (e.g. "admin") is dropped.
  const roles = Array.isArray(body.roles)
    ? body.roles.filter((r: unknown): r is string => typeof r === 'string' && (USER_ROLES as readonly string[]).includes(r))
    : undefined;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update({
      bio,
      availability,
      roles,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(PUBLIC_USER_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (skills && Array.isArray(skills)) {
    const { data: tagRecords } = await supabaseAdmin
      .from('tags')
      .select('id')
      .in('name', skills);

    if (tagRecords) {
      await supabaseAdmin
        .from('user_skills')
        .delete()
        .eq('user_id', userId);

      await supabaseAdmin
        .from('user_skills')
        .insert(
          tagRecords.map((tag: { id: string }) => ({
            user_id: userId,
            tag_id: tag.id,
            proficiency: 'learning',
          }))
        );
    }
  }

  return NextResponse.json(user);
}