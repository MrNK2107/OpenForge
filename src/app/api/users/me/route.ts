import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { bio, availability, roles, skills } = body;

  const { data: user, error } = await supabase
    .from('users')
    .update({
      bio,
      availability,
      roles,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (skills && Array.isArray(skills)) {
    const { data: tagRecords } = await supabase
      .from('tags')
      .select('id')
      .in('name', skills);

    if (tagRecords) {
      await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId);

      await supabase
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