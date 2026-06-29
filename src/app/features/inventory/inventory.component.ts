import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { InventoryService } from './inventory.service';
import { InventoryMovement, InventorySummary, MovementFilter } from './inventory.models';
import { StockEntryModalComponent } from './stock-entry-modal/stock-entry-modal.component';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../shared/directives/can.directive';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [DatePipe, StockEntryModalComponent, DataTableComponent, ColumnCellDirective, CanDirective, TranslatePipe],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent {
  private readonly service = inject(InventoryService);

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

  constructor() {
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
