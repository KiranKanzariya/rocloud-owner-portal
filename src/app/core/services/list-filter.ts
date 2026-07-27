import { ActivatedRoute, Params, Router } from '@angular/router';

/**
 * Query-param persistence for the list screens' filter objects.
 *
 * Each list kept its filter in a plain object rebuilt in the constructor and never written
 * anywhere, so filtering a list, opening a record and pressing Back dropped every filter,
 * the search term, the sort and the page. Nor could a filtered view be bookmarked or shared.
 *
 * Usage — two lines per component:
 *
 *   protected filter: OrderFilter = readFilter(this.route, DEFAULTS);
 *   …
 *   private apply(next: Partial<OrderFilter>) {
 *     this.filter = { ...this.filter, ...next };
 *     writeFilter(this.router, this.route, this.filter, DEFAULTS);
 *     this.load();
 *   }
 */

/** Values that round-trip through a URL. */
type Primitive = string | number | boolean | undefined;
type FilterShape = Record<string, Primitive>;

/**
 * Rebuilds a filter from the current query params, coercing each value to the type of the
 * matching default. Unknown params are ignored; missing ones fall back to the default.
 */
export function readFilter<T extends FilterShape>(route: ActivatedRoute, defaults: T): T {
  const qp = route.snapshot.queryParamMap;
  const out = { ...defaults };

  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const raw = qp.get(String(key));
    if (raw === null || raw === '') continue;

    const fallback = defaults[key];
    let value: Primitive;
    if (typeof fallback === 'number') {
      const n = Number(raw);
      value = Number.isFinite(n) ? n : fallback;
    } else if (typeof fallback === 'boolean') {
      value = raw === 'true';
    } else {
      value = raw;
    }
    out[key] = value as T[keyof T];
  }
  return out;
}

/**
 * Mirrors the filter into the URL, omitting anything still at its default so the address bar
 * stays readable. `replaceUrl` keeps the back button meaning "the previous screen" rather than
 * "the previous filter keystroke".
 */
export function writeFilter<T extends FilterShape>(
  router: Router,
  route: ActivatedRoute,
  filter: T,
  defaults: T,
  extra: Params = {},
): void {
  const queryParams: Params = { ...extra };

  for (const key of Object.keys(filter) as (keyof T)[]) {
    const value = filter[key];
    const name = String(key);
    queryParams[name] = value === undefined || value === '' || value === defaults[key] ? null : value;
  }

  void router.navigate([], {
    relativeTo: route,
    queryParams,
    queryParamsHandling: 'merge',
    replaceUrl: true,
  });
}

/**
 * True when anything is narrowing the list — drives the data table's "no matches" empty state
 * and whether the Clear button is offered. Paging and sorting don't count as filtering.
 */
export function isFiltered<T extends FilterShape>(
  filter: T,
  defaults: T,
  ignore: (keyof T)[] = ['page', 'pageSize', 'sortBy', 'sortDir'] as (keyof T)[],
): boolean {
  return (Object.keys(filter) as (keyof T)[]).some(
    (k) => !ignore.includes(k) && filter[k] !== undefined && filter[k] !== '' && filter[k] !== defaults[k],
  );
}
