/**
 * Minimal in-memory stand-in for the supabase-js query builder, for route tests.
 * Supports: select (incl. count/head), insert, update, upsert, delete, eq, in, or (ignored),
 * order/limit/range (ignored), single, maybeSingle. Embedded relations in select() are
 * not resolved; rows come back as stored.
 */
type Row = Record<string, unknown>;

export function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  const calls: Array<{ table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> }> = [];

  function from(table: string) {
    tables[table] ??= [];
    let op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
    let payload: Row | Row[] | undefined;
    let countMode = false;
    let headMode = false;
    let returning = false;
    const filters: Array<[string, unknown]> = [];
    const inFilters: Array<[string, unknown[]]> = [];

    const matches = (r: Row) =>
      filters.every(([c, v]) => r[c] === v) && inFilters.every(([c, vs]) => vs.includes(r[c]));

    function run(): { data: unknown; error: unknown; count?: number } {
      calls.push({ table, op, payload, filters: [...filters] });
      const rows = tables[table];
      if (op === 'select') {
        const hit = rows.filter(matches);
        return { data: headMode ? null : hit, error: null, count: countMode ? hit.length : undefined };
      }
      if (op === 'insert' || op === 'upsert') {
        const list = Array.isArray(payload) ? payload : [payload!];
        const inserted = list.map((r, i) => ({ id: `${table}-${rows.length + i + 1}`, ...r }));
        rows.push(...inserted);
        return { data: returning ? inserted : null, error: null };
      }
      if (op === 'update') {
        const hit = rows.filter(matches);
        hit.forEach((r) => Object.assign(r, payload));
        return { data: returning ? hit : null, error: null };
      }
      const keep = rows.filter((r) => !matches(r));
      tables[table] = keep;
      return { data: null, error: null };
    }

    const b = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (op === 'select') {
          countMode = !!opts?.count;
          headMode = !!opts?.head;
        } else returning = true;
        return b;
      },
      insert(p: Row | Row[]) { op = 'insert'; payload = p; return b; },
      upsert(p: Row | Row[]) { op = 'upsert'; payload = p; return b; },
      update(p: Row) { op = 'update'; payload = p; return b; },
      delete() { op = 'delete'; return b; },
      eq(c: string, v: unknown) { filters.push([c, v]); return b; },
      in(c: string, vs: unknown[]) { inFilters.push([c, vs]); return b; },
      or() { return b; },
      order() { return b; },
      limit() { return b; },
      range() { return b; },
      single() {
        const r = run();
        const arr = (r.data as Row[] | null) ?? [];
        return Promise.resolve(
          arr.length === 1
            ? { data: arr[0], error: null }
            : { data: null, error: { code: 'PGRST116', message: 'not exactly one row' } }
        );
      },
      maybeSingle() {
        const r = run();
        const arr = (r.data as Row[] | null) ?? [];
        return Promise.resolve({ data: arr[0] ?? null, error: null });
      },
      then<T>(resolve: (v: { data: unknown; error: unknown; count?: number }) => T, reject?: (e: unknown) => T) {
        try {
          return Promise.resolve(resolve(run()));
        } catch (e) {
          return reject ? Promise.resolve(reject(e)) : Promise.reject(e);
        }
      },
    };
    return b;
  }

  return { client: { from }, tables, calls };
}
