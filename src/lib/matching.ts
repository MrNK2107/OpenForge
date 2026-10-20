import { supabase } from './supabase';

export interface UserSkills {
  userId: string;
  skills: string[];
  difficulty?: string;
  availability?: string;
}

export interface ProjectInfo {
  projectId: string;
  tags: string[];
  rolesNeeded: string[];
  difficulty?: string;
  timeCommitment?: string;
  status: string;
  ownerId: string;
}

export interface MatchScore {
  score: number;
  reasons: string[];
}

/** Minimum score (0-100) for a project to be shown as a match. */
export const MATCH_THRESHOLD = 30;

const WEIGHTS = {
  skills: 0.4,
  difficulty: 0.2,
  availability: 0.2,
  roles: 0.2,
} as const;

/** Parse the leading integer of strings like "5-10 hrs/week" or "10 hours". */
export function parseLeadingHours(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Pure weighted match score between a user and a project.
 * Only criteria with data on both sides contribute, and the result is
 * normalised by the total weight used, so missing data neither helps nor hurts.
 */
export function scoreMatch(user: UserSkills, project: ProjectInfo): MatchScore {
  const reasons: string[] = [];
  let totalWeight = 0;
  let score = 0;

  const userSkillsSet = new Set(user.skills.map((s) => s.toLowerCase()));
  const projectTagsSet = new Set(project.tags.map((t) => t.toLowerCase()));

  if (userSkillsSet.size > 0 && projectTagsSet.size > 0) {
    const intersection = [...userSkillsSet].filter((s) => projectTagsSet.has(s));
    const union = new Set([...userSkillsSet, ...projectTagsSet]);
    score += (intersection.length / union.size) * WEIGHTS.skills;
    totalWeight += WEIGHTS.skills;
    reasons.push(...intersection.map(capitalize));
  }

  if (user.difficulty && project.difficulty) {
    const same = user.difficulty.toLowerCase() === project.difficulty.toLowerCase();
    score += (same ? 1 : 0.5) * WEIGHTS.difficulty;
    totalWeight += WEIGHTS.difficulty;
    if (same) reasons.push(project.difficulty);
  }

  const userHours = parseLeadingHours(user.availability);
  const projectHours = parseLeadingHours(project.timeCommitment);
  if (userHours !== null && projectHours !== null) {
    score += (userHours >= projectHours ? 1 : 0.7) * WEIGHTS.availability;
    totalWeight += WEIGHTS.availability;
  }

  if (project.rolesNeeded.length > 0) {
    const matchingRoles = project.rolesNeeded.filter((role) =>
      user.skills.some((s) => s.toLowerCase().includes(role.toLowerCase()))
    );
    score += (matchingRoles.length > 0 ? 1 : 0.3) * WEIGHTS.roles;
    totalWeight += WEIGHTS.roles;
    reasons.push(...matchingRoles);
  }

  const finalScore = totalWeight > 0 ? score / totalWeight : 0;

  return {
    score: Math.round(finalScore * 100),
    reasons: [...new Set(reasons)].slice(0, 5),
  };
}

/** Backwards-compatible async wrapper. */
export async function calculateMatchScore(user: UserSkills, project: ProjectInfo): Promise<MatchScore> {
  return scoreMatch(user, project);
}

type Row = Record<string, unknown>;

/** Extract tag names from a Supabase `project_tags(tag:tags(name))` join, or a flat tag list. */
export function extractTagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => {
      if (typeof t === 'string') return t;
      if (t && typeof t === 'object') {
        const obj = t as { name?: string; tag?: { name?: string } };
        return obj.tag?.name ?? obj.name;
      }
      return undefined;
    })
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
}

/** Open (unfilled) role names from a `project_roles_needed` join. */
export function extractOpenRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return (roles as Row[])
    .filter((r) => r && !r.filled && typeof r.role_name === 'string')
    .map((r) => r.role_name as string);
}

/** Score, filter and rank raw project rows for a user. Pure. */
export function rankProjectsForUser(
  user: UserSkills,
  projects: Row[],
  { limit = 10, threshold = MATCH_THRESHOLD }: { limit?: number; threshold?: number } = {}
) {
  return projects
    .filter((p) => p.owner_id !== user.userId)
    .map((project) => {
      const { score, reasons } = scoreMatch(user, {
        projectId: project.id as string,
        tags: extractTagNames(project.tags),
        rolesNeeded: extractOpenRoles(project.roles_needed),
        difficulty: (project.difficulty as string | null) ?? undefined,
        timeCommitment: (project.time_commitment as string | null) ?? undefined,
        status: project.status as string,
        ownerId: project.owner_id as string,
      });
      return { project, score, reasons };
    })
    .filter((m) => m.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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

  const { data: projects } = await supabase
    .from('projects')
    .select('*, tags:project_tags(tag:tags(name)), roles_needed:project_roles_needed(role_name, filled)')
    .eq('is_public', true)
    .eq('status', 'seeking')
    .neq('owner_id', userId);

  if (!projects) return [];

  return rankProjectsForUser(
    {
      userId,
      skills: extractTagNames(userSkills),
      availability: user?.availability || undefined,
    },
    projects as Row[],
    { limit }
  );
}
