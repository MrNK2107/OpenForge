type Row = Record<string, unknown>;

/**
 * Supabase returns tags through the join table as `[{ tag: { id, name, color } }]`.
 * The UI (ProjectCard, project detail) expects a flat `Tag[]`. Flatten it and
 * drop empty entries; already-flat tags pass through unchanged.
 */
export function flattenTags(tags: unknown): Row[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (t && typeof t === 'object' && 'tag' in t ? (t as { tag: unknown }).tag : t))
    .filter((t): t is Row => !!t && typeof t === 'object');
}

export function normalizeProject<T extends Row>(project: T): T & { tags: Row[] } {
  return { ...project, tags: flattenTags(project.tags) };
}
