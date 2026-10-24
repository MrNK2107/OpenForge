import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_MODE_ERROR } from '@/lib/demo-data';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const { id } = await params;
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const { error } = await supabase
    .from('join_requests')
    .insert({
      project_id: id,
      user_id: userId,
      message: body.message || null,
      status: 'pending',
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}