import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
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
    { key: 'balance', header: 'Balance', align: 'right' },
    { key: 'isActive', header: 'Status' },
    { key: 'actions', header: '', align: 'right' },
  ];

  protected filter: CustomerFilter = { page: 1, pageSize: 25, sortBy: 'name', sortDir: 'asc' };

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.filter = { ...this.filter, search: term || undefined, page: 1 };
        this.load();
      });
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

  setDeliveryMode(mode: string | undefined): void {
    this.filter = { ...this.filter, deliveryMode: mode, page: 1 };
    this.load();
  }

  setStatus(isActive: boolean | undefined): void {
    this.filter = { ...this.filter, isActive, page: 1 };
    this.load();
  }

  onSort(s: SortState): void {
    this.filter = { ...this.filter, sortBy: s.sortBy, sortDir: s.sortDir };
    this.load();
  }

  onPage(page: number): void {
    this.filter = { ...this.filter, page };
    this.load();
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
