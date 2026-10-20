import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoProjectsFiltered, DEMO_MODE_ERROR } from '@/lib/demo-data';
import { normalizeProject } from '@/lib/normalize';
import type { Project } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (!isSupabaseConfigured) return NextResponse.json(demoProjectsFiltered({ status: searchParams.get('status'), difficulty: searchParams.get('difficulty'), search: searchParams.get('search') }).map(normalizeProject));
  const status = searchParams.get('status');
  const difficulty = searchParams.get('difficulty');
  const search = searchParams.get('search');
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset') || '0';
  const owner = searchParams.get('owner');

  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, username, avatar_url),
      tags:project_tags!project_tags_project_id_fkey(tag:tags(id, name, color)),
      members:project_members!project_members_project_id_fkey(user:users(id, username, avatar_url))
    `)
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  // Owners see their own private projects; everyone else only sees public ones.
  const viewerId = (await cookies()).get('user_id')?.value;
  if (owner) query = query.eq('owner_id', owner);
  if (!owner || owner !== viewerId) query = query.eq('is_public', true);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (difficulty && difficulty !== 'all') {
    query = query.eq('difficulty', difficulty);
  }

  if (search) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const safe = search.replace(/[,()*%\\]/g, ' ').trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json([], { status: 200 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json([]);
  }

  const projectsWithStars = await Promise.all(
    (projects as Record<string, unknown>[]).map(async (project: Record<string, unknown>) => {
      const { count } = await supabase
        .from('project_stars')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);

      return {
        ...normalizeProject(project),
        stars_count: count || 0,
      };
    })
  );

  return NextResponse.json(projectsWithStars);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      difficulty,
      scope,
      time_commitment,
      license,
      template_type,
      tags = [],
    } = body;

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        owner_id: userId,
        title,
        description,
        status: 'draft',
        difficulty,
        scope,
        time_commitment,
        license: license || 'MIT',
        template_type,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (tags.length > 0) {
      const { data: tagRecords } = await supabase
        .from('tags')
        .select('id')
        .in('name', tags);

      if (tagRecords) {
        await supabase
          .from('project_tags')
          .insert(
            tagRecords.map((tag: { id: string }) => ({
              project_id: project.id,
              tag_id: tag.id,
            }))
          );
      }
    }

    const { data: owner } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', userId)
      .single();

    return NextResponse.json({ ...project, owner }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}