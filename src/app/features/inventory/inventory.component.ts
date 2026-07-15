import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InventoryService } from './inventory.service';
import { InventoryMovement, InventorySummary, MovementFilter } from './inventory.models';
import { StockEntryModalComponent } from './stock-entry-modal/stock-entry-modal.component';
import { CustomerService } from '../customers/customer.service';
import { CustomerListItem } from '../customers/customer.models';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../shared/directives/can.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { MobilePipe } from '../../shared/pipes/mobile.pipe';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, StockEntryModalComponent, DataTableComponent, ColumnCellDirective, CanDirective, TranslatePipe, MobilePipe],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent {
  private readonly service = inject(InventoryService);
  private readonly customers = inject(CustomerService);

  protected readonly summary = signal<InventorySummary[]>([]);
  protected readonly movements = signal<InventoryMovement[]>([]);
  protected readonly totalMovements = signal(0);
  protected readonly loadingMovements = signal(false);
  protected readonly modalOpen = signal(false);

  protected readonly twentyL = computed(() => this.summary().find((s) => s.bottleSize === '20L') ?? null);
  protected readonly eighteenL = computed(() => this.summary().find((s) => s.bottleSize === '18L') ?? null);
  protected readonly otherSizes = computed(() =>
    this.summary().filter((s) => s.bottleSize !== '20L' && s.bottleSize !== '18L'),
  );

  protected readonly columns: ColumnDef[] = [
    { key: 'createdAt', header: 'Date' },
    { key: 'productName', header: 'Product' },
    { key: 'movementType', header: 'Type' },
    { key: 'quantity', header: 'Qty', align: 'right' },
    { key: 'customerName', header: 'Customer' },
    { key: 'notes', header: 'Notes' },
  ];

  protected filter: MovementFilter = { page: 1, pageSize: 25 };

  // Customer filter: a debounced search over the customers list, with a small results dropdown.
  protected readonly customerSearch = new FormControl('', { nonNullable: true });
  protected readonly customerResults = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomer = signal<CustomerListItem | null>(null);

  constructor() {
    this.customerSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        // Once a customer is picked the box shows their name; don't re-search until it's cleared.
        if (this.selectedCustomer() || !term.trim()) {
          this.customerResults.set([]);
          return;
        }
        this.customers.list({ search: term.trim(), page: 1, pageSize: 6 })
          .subscribe((r) => this.customerResults.set(r.items));
      });
    this.loadSummary();
    this.loadMovements();
  }

  loadSummary(): void {
    this.service.list().subscribe((s) => this.summary.set(s));
  }

  loadMovements(): void {
    this.loadingMovements.set(true);
    this.service.movements(this.filter).subscribe({
      next: (res) => {
        this.movements.set(res.items);
        this.totalMovements.set(res.totalCount);
        this.loadingMovements.set(false);
      },
      error: () => this.loadingMovements.set(false),
    });
  }

  setType(type: string): void {
    this.filter = { ...this.filter, movementType: type || undefined, page: 1 };
    this.loadMovements();
  }

  selectCustomer(c: CustomerListItem): void {
    this.selectedCustomer.set(c);
    this.customerResults.set([]);
    this.customerSearch.setValue(c.name, { emitEvent: false });
    this.filter = { ...this.filter, customerId: c.id, page: 1 };
    this.loadMovements();
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.filter = { ...this.filter, customerId: undefined, page: 1 };
    this.loadMovements();
  }

  onPage(page: number): void {
    this.filter = { ...this.filter, page };
    this.loadMovements();
  }

  onSaved(): void {
    this.modalOpen.set(false);
    this.loadSummary();
    this.loadMovements();
  }

  typeClass(type: string): string {
    switch (type) {
      case 'Restock':
      case 'Return': return 'status-delivered';
      case 'Issue': return 'status-in-transit';
      case 'Damage': return 'status-overdue';
      default: return 'status-active-info';
    }
  }
}
