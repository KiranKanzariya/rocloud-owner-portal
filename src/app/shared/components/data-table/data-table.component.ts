import { Component, DestroyRef, computed, contentChildren, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ColumnCellDirective } from './column-cell.directive';

export interface ColumnDef {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  /** Optional fixed column width (any CSS length, e.g. '120px' / '10rem'). Unset columns share the rest. */
  width?: string;
  /**
   * Hide this column from the stacked mobile card (it stays in the desktop table).
   * Use for columns whose meaning is already carried by another cell.
   */
  hideOnMobile?: boolean;
}

export interface SortState {
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

/** Below this width the table is replaced by stacked cards — see `compact` below. */
const COMPACT_QUERY = '(max-width: 639px)';

/**
 * Reusable, signal-driven data table (guide §20). Renders plain `row[col.key]` by default;
 * callers project `<ng-template appColumnCell="key" let-row>` for custom cells (badges, actions).
 *
 * Two presentations from one set of column definitions:
 *  - ≥640px: a real table inside a horizontal scroller. It keeps a `--table-min` floor so columns
 *    stop compressing and the container scrolls sideways instead (previously `table-fixed w-full`
 *    inside `overflow-hidden` squeezed 8 columns into whatever was available, and the parent
 *    `<main>` has `overflow-x-hidden`, so anything past the edge was clipped and unreachable).
 *  - <640px: one card per row with `header: value` pairs, which is legible on a phone in a way
 *    that a sideways-scrolling 8-column grid never is.
 *
 * Only the active presentation is rendered (`compact` is a matchMedia-backed signal), so the DOM
 * isn't doubled.
 */
@Component({
  selector: 'roc-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, TranslatePipe],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T> {
  readonly columns = input.required<ColumnDef[]>();
  readonly rows = input.required<T[]>();
  readonly totalCount = input(0);
  readonly loading = input(false);
  readonly page = input(1);
  readonly pageSize = input(25);
  readonly sortBy = input<string | undefined>(undefined);
  readonly sortDir = input<'asc' | 'desc'>('asc');

  /**
   * Rows open a record. Makes them focusable, keyboard-activatable (Enter/Space) and
   * pointer-styled. Off by default so read-only grids don't advertise a click that does
   * nothing — set it wherever `(rowClick)` is handled.
   */
  readonly rowLink = input(false);

  /**
   * A filter or search term is currently narrowing the list. Switches the empty state from
   * "nothing here yet" to "nothing matched" and offers a way back out.
   */
  readonly filtered = input(false);

  /** Minimum table width before the horizontal scroller kicks in. */
  readonly minWidth = input('44rem');

  readonly sortChange = output<SortState>();
  readonly pageChange = output<number>();
  readonly rowClick = output<T>();
  readonly clearFilters = output<void>();

  /**
   * Placeholder rows shown as shimmering skeletons while loading. Kept short (3) so the loading
   * state isn't taller than a small result — otherwise the page briefly overflows and flashes a
   * scrollbar before the real rows shrink it back.
   */
  protected readonly skeletonRows = [0, 1, 2];

  private readonly cellDirectives = contentChildren(ColumnCellDirective);
  protected readonly cellMap = computed(
    () => new Map(this.cellDirectives().map((d) => [d.key, d.tpl])),
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / Math.max(1, this.pageSize()))),
  );

  /** Columns worth showing on the stacked card — an empty header is a layout column (actions). */
  protected readonly cardColumns = computed(() =>
    this.columns().filter((c) => !c.hideOnMobile && c.header !== ''),
  );
  /** Columns with no header render full-width under the card body (row actions). */
  protected readonly cardActionColumns = computed(() =>
    this.columns().filter((c) => !c.hideOnMobile && c.header === ''),
  );

  /** True while the viewport is phone-width. matchMedia rather than a resize listener. */
  protected readonly compact = signal(false);

  constructor() {
    // `matchMedia` is absent under SSR/unit tests — degrade to the table presentation.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia(COMPACT_QUERY);
      this.compact.set(mql.matches);
      const onChange = (e: MediaQueryListEvent) => this.compact.set(e.matches);
      mql.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
    }
  }

  protected value(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  protected onSort(col: ColumnDef): void {
    if (!col.sortable) return;
    const dir: 'asc' | 'desc' = this.sortBy() === col.key && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ sortBy: col.key, sortDir: dir });
  }

  protected activate(row: T): void {
    if (this.rowLink()) this.rowClick.emit(row);
  }

  /**
   * Enter/Space open the row, matching the click. Ignored when the key came from a control
   * inside the row (an action button, a checkbox) so its own handler isn't shadowed.
   */
  protected onRowKey(event: KeyboardEvent, row: T): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, textarea') !== event.currentTarget) return;
    event.preventDefault();
    this.activate(row);
  }

  protected prev(): void {
    if (this.page() > 1) this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    if (this.page() < this.totalPages()) this.pageChange.emit(this.page() + 1);
  }
}
