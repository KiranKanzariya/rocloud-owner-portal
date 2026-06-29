/**
 * Helpers for driving <roc-data-table> from a fully-loaded client-side list (sort + paginate in the
 * browser). Pages that fetch all rows at once use these instead of server-side paging.
 */

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Returns the rows for the current page after sorting the whole list by `sortBy`/`sortDir`. */
export function sortAndPage<T>(
  rows: readonly T[], sortBy: string, sortDir: 'asc' | 'desc', page: number, pageSize: number,
): T[] {
  const sorted = sortBy
    ? [...rows].sort((a, b) => compare((a as Record<string, unknown>)[sortBy], (b as Record<string, unknown>)[sortBy]) * (sortDir === 'asc' ? 1 : -1))
    : [...rows];
  const start = (page - 1) * pageSize;
  return sorted.slice(start, start + pageSize);
}
