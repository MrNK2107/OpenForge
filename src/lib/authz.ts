import { supabase } from '@/lib/supabase';

/** True if the user owns the project or is a member of it. */
export async function canEditProject(userId: string, projectId: string): Promise<boolean> {
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();
  if (!project) return false;
  if (project.owner_id === userId) return true;
  const { count } = await supabase
    .from('project_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}
