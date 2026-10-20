import { describe, it, expect } from 'vitest';
import { TEMPLATES, generateRepoFiles } from '../repo-templates';

describe('repo templates', () => {
  it('every template has files and starter issues', () => {
    for (const [key, t] of Object.entries(TEMPLATES)) {
      expect(t.name, key).toBeTruthy();
      expect(Object.keys(t.files).length, key).toBeGreaterThan(0);
      expect(t.starterIssues.length, key).toBeGreaterThan(0);
    }
  });

  it.each(Object.keys(TEMPLATES))('generates non-empty files for %s with project data interpolated', (key) => {
    const { files, starterIssues } = generateRepoFiles(key, {
      title: 'My Cool Project',
      description: 'Does cool things',
      license: 'Apache-2.0',
      slug: 'my-cool-project',
      owner: 'octocat',
    });
    expect(Object.keys(files).length).toBeGreaterThan(0);
    for (const [name, content] of Object.entries(files)) {
      expect(typeof content, name).toBe('string');
      expect(content.length, name).toBeGreaterThan(0);
      expect(content, name).not.toContain('undefined');
    }
    expect(Object.values(files).join('\n')).toContain('My Cool Project');
    expect(starterIssues).toBe(TEMPLATES[key].starterIssues);
  });

  it('falls back to web-app for unknown templates and fills defaults', () => {
    const { files } = generateRepoFiles('nope', {});
    expect(Object.keys(files)).toEqual(Object.keys(TEMPLATES['web-app'].files));
    expect(Object.values(files).join('\n')).toContain('Untitled');
  });
});
