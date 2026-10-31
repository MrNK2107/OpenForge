import { supabase } from '@/lib/supabase';

async function isMember(userId: string, projectId: string): Promise<boolean> {
  const { count } = await supabase
    .from('project_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

/** True if the user owns the project or is a member of it. */
export async function canEditProject(userId: string, projectId: string): Promise<boolean> {
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();
  if (!project) return false;
  if (project.owner_id === userId) return true;
  return isMember(userId, projectId);
}

/**
 * True if the viewer may see the project (and its tasks): public projects are visible
 * to everyone, private ones only to the owner and members. `viewerId` may be null.
 */
export async function canViewProject(viewerId: string | null, projectId: string): Promise<boolean> {
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, is_public')
    .eq('id', projectId)
    .single();
  if (!project) return false;
  if (project.is_public) return true;
  if (!viewerId) return false;
  if (project.owner_id === viewerId) return true;
  return isMember(viewerId, projectId);
}

/** Columns of `users` that are safe to return to the browser (never the GitHub token). */
export const PUBLIC_USER_COLUMNS =
  'id, github_id, username, email, avatar_url, bio, roles, availability, created_at, updated_at';

export const PROJECT_STATUSES = ['draft', 'seeking', 'active', 'paused', 'archived'] as const;
export const USER_ROLES = ['pitcher', 'contributor', 'mentor'] as const;
