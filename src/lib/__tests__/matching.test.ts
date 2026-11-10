import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import {
  scoreMatch,
  calculateMatchScore,
  parseLeadingHours,
  extractTagNames,
  extractOpenRoles,
  rankProjectsForUser,
  MATCH_THRESHOLD,
  type ProjectInfo,
  type UserSkills,
} from '../matching';

const user = (over: Partial<UserSkills> = {}): UserSkills => ({ userId: 'u1', skills: [], ...over });
const project = (over: Partial<ProjectInfo> = {}): ProjectInfo => ({
  projectId: 'p1',
  tags: [],
  rolesNeeded: [],
  status: 'seeking',
  ownerId: 'o1',
  ...over,
});

describe('parseLeadingHours', () => {
  it('parses leading integers from free text', () => {
    expect(parseLeadingHours('5-10 hours/week')).toBe(5);
    expect(parseLeadingHours('10 hours')).toBe(10);
    expect(parseLeadingHours('about 3h')).toBe(3);
  });
  it('returns null for missing or non-numeric input', () => {
    expect(parseLeadingHours(undefined)).toBeNull();
    expect(parseLeadingHours('')).toBeNull();
    expect(parseLeadingHours('flexible')).toBeNull();
  });
});

describe('scoreMatch', () => {
  it('returns 0 with no reasons when nothing is comparable', () => {
    expect(scoreMatch(user(), project())).toEqual({ score: 0, reasons: [] });
  });

  it('scores 100 for identical skills/tags only', () => {
    const r = scoreMatch(user({ skills: ['React', 'TypeScript'] }), project({ tags: ['react', 'typescript'] }));
    expect(r.score).toBe(100);
    expect(r.reasons).toEqual(['React', 'Typescript']);
  });

  it('uses Jaccard similarity, case-insensitively', () => {
    // intersection 1 / union 3
    const r = scoreMatch(user({ skills: ['RUST', 'go'] }), project({ tags: ['rust', 'python'] }));
    expect(r.score).toBe(Math.round((1 / 3) * 100));
  });

  it('rewards matching difficulty and gives half credit otherwise', () => {
    const same = scoreMatch(user({ difficulty: 'beginner' }), project({ difficulty: 'Beginner' }));
    const diff = scoreMatch(user({ difficulty: 'beginner' }), project({ difficulty: 'advanced' }));
    expect(same.score).toBe(100);
    expect(same.reasons).toContain('Beginner');
    expect(diff.score).toBe(50);
  });

  it('compares availability against time commitment', () => {
    expect(scoreMatch(user({ availability: '10-15 hrs' }), project({ timeCommitment: '5 hours/week' })).score).toBe(100);
    expect(scoreMatch(user({ availability: '2-4 hrs' }), project({ timeCommitment: '5 hours/week' })).score).toBe(70);
  });

  it('ignores availability when it cannot be parsed (no NaN leaks)', () => {
    const r = scoreMatch(user({ availability: 'flexible' }), project({ timeCommitment: '5 hours' }));
    expect(r.score).toBe(0);
    expect(Number.isNaN(r.score)).toBe(false);
  });

  it('matches roles by substring and gives partial credit when none match', () => {
    const hit = scoreMatch(user({ skills: ['frontend-dev'] }), project({ rolesNeeded: ['frontend'] }));
    const miss = scoreMatch(user({ skills: ['python'] }), project({ rolesNeeded: ['designer'] }));
    expect(hit.score).toBe(100);
    expect(hit.reasons).toContain('frontend');
    expect(miss.score).toBe(30);
  });

  it('dedupes reasons and caps them at 5', () => {
    const skills = ['a', 'b', 'c', 'd', 'e', 'f'];
    const r = scoreMatch(user({ skills }), project({ tags: skills, rolesNeeded: ['a'] }));
    expect(r.reasons.length).toBeLessThanOrEqual(5);
    expect(new Set(r.reasons).size).toBe(r.reasons.length);
  });

  it('weights criteria and normalises by the weight used', () => {
    // skills: jaccard 1 -> 0.4, roles: miss -> 0.3 * 0.2 = 0.06; total weight 0.6
    const r = scoreMatch(user({ skills: ['rust'] }), project({ tags: ['rust'], rolesNeeded: ['designer'] }));
    expect(r.score).toBe(Math.round((0.46 / 0.6) * 100));
  });

  it('is exposed through the async calculateMatchScore wrapper', async () => {
    await expect(calculateMatchScore(user({ skills: ['x'] }), project({ tags: ['x'] }))).resolves.toEqual({
      score: 100,
      reasons: ['X'],
    });
  });
});

describe('extractTagNames / extractOpenRoles', () => {
  it('handles nested joins, flat tags, strings and junk', () => {
    expect(extractTagNames([{ tag: { name: 'react' } }, { name: 'rust' }, 'go', null, { tag: null }, 3])).toEqual([
      'react',
      'rust',
      'go',
    ]);
    expect(extractTagNames(undefined)).toEqual([]);
  });

  it('returns only unfilled roles', () => {
    expect(
      extractOpenRoles([
        { role_name: 'frontend', filled: false },
        { role_name: 'backend', filled: true },
        { role_name: 'docs' },
        { filled: false },
      ])
    ).toEqual(['frontend', 'docs']);
    expect(extractOpenRoles(null)).toEqual([]);
  });
});

describe('rankProjectsForUser', () => {
  const rows = [
    { id: 'a', owner_id: 'o', status: 'seeking', tags: [{ tag: { name: 'react' } }], roles_needed: [] },
    { id: 'b', owner_id: 'o', status: 'seeking', tags: [{ tag: { name: 'react' } }, { tag: { name: 'css' } }], roles_needed: [] },
    { id: 'c', owner_id: 'o', status: 'seeking', tags: [{ tag: { name: 'cobol' } }], roles_needed: [] },
    { id: 'mine', owner_id: 'u1', status: 'seeking', tags: [{ tag: { name: 'react' } }], roles_needed: [] },
  ];

  it('sorts by score, drops below-threshold and own projects', () => {
    const ranked = rankProjectsForUser(user({ skills: ['react'] }), rows);
    expect(ranked.map((m) => m.project.id)).toEqual(['a', 'b']);
    expect(ranked.every((m) => m.score > MATCH_THRESHOLD)).toBe(true);
  });

  it('respects limit and custom threshold', () => {
    expect(rankProjectsForUser(user({ skills: ['react'] }), rows, { limit: 1 })).toHaveLength(1);
    expect(rankProjectsForUser(user({ skills: ['react'] }), rows, { threshold: 60 }).map((m) => m.project.id)).toEqual(['a']);
  });
});
