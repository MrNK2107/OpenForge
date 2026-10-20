import { supabase } from './supabase';

interface UserSkills {
  userId: string;
  skills: string[];
  difficulty?: string;
  availability?: string;
}

interface ProjectInfo {
  projectId: string;
  tags: string[];
  rolesNeeded: string[];
  difficulty?: string;
  timeCommitment?: string;
  status: string;
  ownerId: string;
}

export async function calculateMatchScore(user: UserSkills, project: ProjectInfo): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let totalWeight = 0;
  let score = 0;

  const userSkillsSet = new Set(user.skills.map(s => s.toLowerCase()));
  const projectTagsSet = new Set(project.tags.map(t => t.toLowerCase()));

  if (userSkillsSet.size > 0 && projectTagsSet.size > 0) {
    const intersection = [...userSkillsSet].filter(s => projectTagsSet.has(s));
    const union = new Set([...userSkillsSet, ...projectTagsSet]);
    const jaccard = intersection.length / union.size;
    score += jaccard * 0.4;
    totalWeight += 0.4;
    
    if (intersection.length > 0) {
      reasons.push(...intersection.map(s => s.charAt(0).toUpperCase() + s.slice(1)));
    }
  }

  if (user.difficulty && project.difficulty) {
    const difficultyMatch = user.difficulty === project.difficulty ? 1.0 : 0.5;
    score += difficultyMatch * 0.2;
    totalWeight += 0.2;
    
    if (difficultyMatch === 1.0) {
      reasons.push(project.difficulty);
    }
  }

  if (user.availability && project.timeCommitment) {
    const userHours = parseInt(user.availability.split('-')[0]);
    const projectHours = parseInt(project.timeCommitment.split(' ')[0]);
    const availabilityMatch = userHours >= projectHours ? 1.0 : 0.7;
    score += availabilityMatch * 0.2;
    totalWeight += 0.2;
  }

  if (project.rolesNeeded.length > 0) {
    const matchingRoles = project.rolesNeeded.filter((role: string) => 
      user.skills.some(s => s.toLowerCase().includes(role.toLowerCase()))
    );
    const roleMatch = matchingRoles.length > 0 ? 1.0 : 0.3;
    score += roleMatch * 0.2;
    totalWeight += 0.2;
    
    if (matchingRoles.length > 0) {
      reasons.push(...matchingRoles);
    }
  }

  const finalScore = totalWeight > 0 ? score / totalWeight : 0;

  return {
    score: Math.round(finalScore * 100),
    reasons: reasons.slice(0, 5),
  };
}

export async function getMatchesForUser(userId: string, limit = 10) {
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('tag:tags(name)')
    .eq('user_id', userId);

  const { data: user } = await supabase
    .from('users')
    .select('availability')
    .eq('id', userId)
    .single();

  const userSkillNames = (userSkills as unknown as Array<{ tag?: { name?: string } }>)?.map((s) => s.tag?.name).filter(Boolean) as string[] || [];

  const { data: projects } = await supabase
    .from('projects')
    .select('*, tags:project_tags(tag:tags(name)), roles_needed:project_roles_needed(role_name)')
    .eq('is_public', true)
    .eq('status', 'seeking')
    .neq('owner_id', userId);

  if (!projects) return [];

  const matches = await Promise.all(
    projects.map(async (project: Record<string, unknown>) => {
      const projectTags = (project.tags as unknown as Array<{ tag?: { name?: string } }>)?.map((t) => t.tag?.name).filter(Boolean) as string[] || [];
      const rolesNeeded = (project.roles_needed as Array<Record<string, unknown>>)?.map((r: Record<string, unknown>) => r.role_name as string) || [];
      const filledRoles = (project.roles_needed as Array<Record<string, unknown>>)?.filter((r: Record<string, unknown>) => r.filled).map((r: Record<string, unknown>) => r.role_name as string) || [];
      const openRoles = rolesNeeded.filter(r => !filledRoles.includes(r));

      const { score, reasons } = await calculateMatchScore(
        {
          userId,
          skills: userSkillNames,
          difficulty: undefined,
          availability: user?.availability || undefined,
        },
        {
          projectId: project.id as string,
          tags: projectTags,
          rolesNeeded: openRoles,
          difficulty: project.difficulty as string | undefined,
          timeCommitment: project.time_commitment as string | undefined,
          status: project.status as string,
          ownerId: project.owner_id as string,
        }
      );

      return {
        project,
        score,
        reasons,
      };
    })
  );

  return matches
    .filter(m => m.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}