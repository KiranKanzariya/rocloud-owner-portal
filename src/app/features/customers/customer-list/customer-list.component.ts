import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { isFiltered, readFilter, writeFilter } from '../../../core/services/list-filter';
import { CustomerService } from '../customer.service';
import { CustomerFilter, CustomerListItem } from '../customer.models';
import { CustomerActions } from '../customer.constants';
import { DataTableComponent, ColumnDef, SortState } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { BottleBadgeComponent } from '../../../shared/components/bottle-badge/bottle-badge.component';
import { CanDirective } from '../../../shared/directives/can.directive';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BottleSize } from '../../../core/models/bottle-size';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    DataTableComponent,
    ColumnCellDirective,
    ConfirmModalComponent,
    BottleBadgeComponent,
    CanDirective,
    TranslatePipe,
    MobilePipe,
  ],
  templateUrl: './customer-list.component.html',
})
export class CustomerListComponent {
  private readonly service = inject(CustomerService);
  protected readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly deliveryModes = CustomerActions.deliveryModes;
  protected readonly paymentPreferences = CustomerActions.paymentPreferences;

  protected readonly rows = signal<CustomerListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly deleteTarget = signal<CustomerListItem | null>(null);

  protected readonly search = new FormControl('', { nonNullable: true });

  protected readonly columns: ColumnDef[] = [
    { key: 'name', header: 'Customer', sortable: true },
    { key: 'areaName', header: 'Area' },
    { key: 'preferredBottleSize', header: 'Bottle' },
    { key: 'jarsOut', header: 'Jars out', align: 'right', sortable: true },
    { key: 'deliveryMode', header: 'Delivery' },
    { key: 'paymentPreference', header: 'Payment' },
    { key: 'balance', header: 'Balance', align: 'right', sortable: true },
    { key: 'isActive', header: 'Status' },
    { key: 'actions', header: '', align: 'right' },
  ];

  /** Baseline the URL is diffed against — only non-default values reach the address bar. */
  private static readonly DEFAULTS = {
    page: 1,
    pageSize: 25,
    sortBy: 'name',
    sortDir: 'asc',
    search: undefined,
    deliveryMode: undefined,
    paymentPreference: undefined,
    isActive: undefined,
  } as unknown as CustomerFilter & Record<string, string | number | boolean | undefined>;

  /** Hydrated from the query string, so Back off a customer restores the list you left. */
  protected filter = readFilter(inject(ActivatedRoute), CustomerListComponent.DEFAULTS);

  /** Drives the table's "no matches" empty state and the Clear button. */
  protected readonly filterState = signal(0);
  protected readonly hasFilters = computed(() => {
    this.filterState();
    return isFiltered(this.filter, CustomerListComponent.DEFAULTS);
  });

  private readonly route = inject(ActivatedRoute);

  constructor() {
    // switchMap, not a nested subscribe: typing "Ram" then "Ramesh" fired two requests and
    // whichever LANDED last won, so a slow early response could overwrite the newer results.
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.apply({ search: term.trim() || undefined });
          this.loading.set(true);
          return this.service.list(this.filter);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (res) => {
          this.rows.set(res.items);
          this.totalCount.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    // Restore the search box from the URL without re-firing the stream.
    if (this.filter.search) this.search.setValue(this.filter.search, { emitEvent: false });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(this.filter).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Single funnel for every filter change: merge, mirror to the URL, refresh the flags. */
  private apply(next: Partial<CustomerFilter>, reload = false): void {
    // A page change keeps the requested page (already in `next`); any OTHER change resets to page 1
    // (you want the top of the new result set). The old form re-read this.filter.page here, which
    // overwrote the requested page with the current one — so paging never advanced.
    this.filter = 'page' in next ? { ...this.filter, ...next } : { ...this.filter, ...next, page: 1 };
    writeFilter(this.router, this.route, this.filter, CustomerListComponent.DEFAULTS);
    this.filterState.update((v) => v + 1);
    if (reload) this.load();
  }

  setDeliveryMode(mode: string | undefined): void {
    this.apply({ deliveryMode: mode }, true);
  }

  setPaymentPreference(pref: string | undefined): void {
    this.apply({ paymentPreference: pref }, true);
  }

  setStatus(isActive: boolean | undefined): void {
    this.apply({ isActive }, true);
  }

  /** Resets every filter and the search box back to the unfiltered list. */
  clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.apply(
      { search: undefined, deliveryMode: undefined, paymentPreference: undefined, isActive: undefined },
      true,
    );
  }

  onSort(s: SortState): void {
    // Reset to page 1: a new sort should show the top of the results, not leave you mid-list on
    // whatever page you were on (matches the Users grid).
    this.apply({ sortBy: s.sortBy, sortDir: s.sortDir }, true);
  }

  onPage(page: number): void {
    this.apply({ page }, true);
  }

  create(): void {
    this.router.navigate(['/customers/new']);
  }

  open(c: CustomerListItem): void {
    this.router.navigate(['/customers', c.id]);
  }

  edit(c: CustomerListItem): void {
    this.router.navigate(['/customers', c.id, 'edit']);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.service.delete(target.id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('{{name}} deleted.', { name: target.name }));
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => {
        this.toast.apiError(err, this.t.instant('Could not delete this customer (they may have open orders).'));
        this.deleteTarget.set(null);
      },
    });
  }

  asBottle(size: string | null): BottleSize | null {
    return (size as BottleSize) ?? null;
  }
}
