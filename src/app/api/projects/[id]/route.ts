import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_PROJECTS, DEMO_MODE_ERROR } from '@/lib/demo-data';
import { normalizeProject } from '@/lib/normalize';
import type { Project } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isSupabaseConfigured) {
    const demo = DEMO_PROJECTS.find((p) => p.id === id);
    return demo ? NextResponse.json(normalizeProject(demo)) : NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, username, avatar_url),
      tags:project_tags!project_tags_project_id_fkey(tag:tags(id, name, color)),
      members:project_members!project_members_project_id_fkey(user:users(id, username, avatar_url)),
      roles_needed:project_roles_needed(id, role_name, filled)
    `)
    .eq('id', id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('project_stars')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id);

  return NextResponse.json({ ...normalizeProject(project), stars_count: count || 0 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const { id } = await params;
  const body = await request.json();

  const { data: project, error } = await supabase
    .from('projects')
    .update({
      title: body.title,
      description: body.description,
      status: body.status,
      difficulty: body.difficulty,
      scope: body.scope,
      time_commitment: body.time_commitment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const { id } = await params;

  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}