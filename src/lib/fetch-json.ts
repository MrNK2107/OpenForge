/**
 * Client-side fetch helpers that never throw and never hand an error payload
 * to code expecting data: on network failure, non-2xx status or a body of the
 * wrong shape they return the provided fallback.
 */

export async function fetchJson<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function fetchArray<T>(url: string, init?: RequestInit): Promise<T[]> {
  const data = await fetchJson<unknown>(url, [], init);
  return Array.isArray(data) ? (data as T[]) : [];
}
