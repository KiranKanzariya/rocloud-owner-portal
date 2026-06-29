import { Component, computed, contentChildren, input, output } from '@angular/core';
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
}

export interface SortState {
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

/**
 * Reusable, signal-driven data table (guide §20). Renders plain `row[col.key]` by default;
 * callers project `<ng-template appColumnCell="key" let-row>` for custom cells (badges, actions).
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

  readonly sortChange = output<SortState>();
  readonly pageChange = output<number>();
  readonly rowClick = output<T>();

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

  protected value(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  protected onSort(col: ColumnDef): void {
    if (!col.sortable) return;
    const dir: 'asc' | 'desc' = this.sortBy() === col.key && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ sortBy: col.key, sortDir: dir });
  }

  protected prev(): void {
    if (this.page() > 1) this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    if (this.page() < this.totalPages()) this.pageChange.emit(this.page() + 1);
  }
}
