import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { canEditProject, canViewProject } from '@/lib/authz';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_TASKS, DEMO_MODE_ERROR } from '@/lib/demo-data';


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_TASKS.filter((t) => t.project_id === id));
  if (!(await canViewProject(await getSessionUserId(), id))) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users(id, username, avatar_url)
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(tasks || []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const userId = await getSessionUserId();
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!(await canEditProject(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, status, difficulty, labels, assignee_id, effort_estimate } = body;

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: id,
      title,
      description,
      status: status || 'backlog',
      difficulty,
      labels: labels || [],
      assignee_id,
      created_by: userId,
      effort_estimate,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(task, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const userId = await getSessionUserId();
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!(await canEditProject(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
  }
  const { id: taskId, status, title, description, difficulty, labels, assignee_id, effort_estimate } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (title) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (difficulty) updates.difficulty = difficulty;
  if (labels) updates.labels = labels;
  if (assignee_id) updates.assignee_id = assignee_id;
  if (effort_estimate) updates.effort_estimate = effort_estimate;

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(task);
}