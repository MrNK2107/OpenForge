import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_MODE_ERROR } from '@/lib/demo-data';

import { generateRepoFiles } from '@/lib/repo-templates';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_MODE_ERROR, { status: 503 });
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('github_access_token, username')
    .eq('id', userId)
    .single();

  if (!user?.github_access_token) {
    return NextResponse.json({ error: 'No GitHub token found' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*, tags:project_tags(tag:tags(name))')
    .eq('id', id)
    .single();

  if (!project || project.owner_id !== userId) {
    return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
  }

  const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tagNames = (project.tags as unknown as Array<{ tag?: { name?: string } }>)?.map((t) => t.tag?.name).filter(Boolean) as string[] || [];

  const { files, starterIssues } = generateRepoFiles(project.template_type || 'web-app', {
    title: project.title,
    description: project.description || '',
    license: project.license || 'MIT',
    owner: user.username || '',
    slug,
  });

  try {
    const repoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.github_access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        name: slug,
        description: project.description,
        private: false,
        auto_init: false,
      }),
    });

    if (!repoResponse.ok) {
      const error = await repoResponse.json();
      return NextResponse.json({ error: error.message || 'Failed to create repo' }, { status: 400 });
    }

    const repoData = await repoResponse.json();

    for (const [path, content] of Object.entries(files)) {
      await fetch(`https://api.github.com/repos/${user.username}/${slug}/contents/${path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.github_access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          message: `Initial commit via OpenForge`,
          content: Buffer.from(content).toString('base64'),
        }),
      });
    }

    for (const issue of starterIssues) {
      await fetch(`https://api.github.com/repos/${user.username}/${slug}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.github_access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          title: issue.title,
          labels: issue.labels,
        }),
      });
    }

    await supabase
      .from('projects')
      .update({
        github_repo_url: repoData.html_url,
        github_repo_id: repoData.id,
        status: 'seeking',
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      repo_url: repoData.html_url,
    });
  } catch (error) {
    console.error('Error generating repo:', error);
    return NextResponse.json({ error: 'Failed to generate repository' }, { status: 500 });
  }
}