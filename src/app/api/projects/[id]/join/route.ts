import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin';
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

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id, is_public, status')
    .eq('id', id)
    .single();
  // Only public, non-archived projects accept requests; hide private ones (404, not 403).
  if (!project || !project.is_public) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (project.owner_id === userId) {
    return NextResponse.json({ error: 'You own this project' }, { status: 400 });
  }
  if (project.status === 'archived') {
    return NextResponse.json({ error: 'Project is archived' }, { status: 400 });
  }
  const { count: pending } = await supabaseAdmin
    .from('join_requests')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('user_id', userId)
    .eq('status', 'pending');
  if ((pending ?? 0) > 0) {
    return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.slice(0, 2000) : null;

  const { error } = await supabaseAdmin
    .from('join_requests')
    .insert({
      project_id: id,
      user_id: userId,
      message: message || null,
      status: 'pending',
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}