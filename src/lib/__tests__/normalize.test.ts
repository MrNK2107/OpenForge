import { describe, it, expect } from 'vitest';
import { flattenTags, normalizeProject } from '../normalize';
import { hasSupabaseConfig } from '../supabase';
import { DEMO_PROJECTS, demoProjectsFiltered } from '../demo-data';

describe('flattenTags / normalizeProject', () => {
  it('flattens Supabase join rows and keeps flat tags', () => {
    expect(flattenTags([{ tag: { id: '1', name: 'a' } }, { id: '2', name: 'b' }, { tag: null }, null])).toEqual([
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ]);
    expect(flattenTags(undefined)).toEqual([]);
  });

  it('normalizes a project without mutating it', () => {
    const p = { id: 'x', tags: [{ tag: { name: 'rust' } }] };
    expect(normalizeProject(p).tags).toEqual([{ name: 'rust' }]);
    expect(p.tags[0]).toHaveProperty('tag');
  });
});

describe('hasSupabaseConfig', () => {
  it('requires both a URL and key and rejects placeholders', () => {
    expect(hasSupabaseConfig(undefined, 'k')).toBe(false);
    expect(hasSupabaseConfig('https://x.supabase.co', undefined)).toBe(false);
    expect(hasSupabaseConfig('not-a-url', 'k')).toBe(false);
    expect(hasSupabaseConfig('http://localhost:54321', 'demo-anon-key-placeholder')).toBe(false);
    expect(hasSupabaseConfig('https://x.supabase.co', 'real-looking-key')).toBe(true);
  });
});

describe('demo data', () => {
  it('filters by status, difficulty and search text', () => {
    expect(demoProjectsFiltered({})).toHaveLength(DEMO_PROJECTS.length);
    expect(demoProjectsFiltered({ status: 'active' }).every((p) => p.status === 'active')).toBe(true);
    expect(demoProjectsFiltered({ difficulty: 'beginner' }).map((p) => p.id)).toEqual(['demo-carbon-lens']);
    expect(demoProjectsFiltered({ search: 'AUTOGRAD' }).map((p) => p.id)).toEqual(['demo-tiny-tensor']);
    expect(demoProjectsFiltered({ status: 'all', difficulty: 'all', search: '  ' })).toHaveLength(DEMO_PROJECTS.length);
  });
});
