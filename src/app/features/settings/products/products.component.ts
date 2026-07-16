import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DataTableComponent, ColumnDef, SortState } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { sortAndPage } from '../../../shared/components/data-table/client-table';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, TranslatePipe, DataTableComponent, ColumnCellDirective],
  templateUrl: './products.component.html',
})
export class ProductsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProductService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  // Client-side sort + paginate for the shared data table.
  protected readonly columns: ColumnDef[] = [
    { key: 'name', header: 'Product', sortable: true },
    { key: 'bottleSize', header: 'Size', sortable: true },
    { key: 'defaultRate', header: 'Rate', sortable: true, align: 'right' },
    { key: 'isActive', header: 'Status', sortable: true },
    { key: 'actions', header: '', align: 'right', width: '90px' },
  ];
  protected readonly sortBy = signal('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly rows = computed(() => sortAndPage(this.products(), this.sortBy(), this.sortDir(), this.page(), this.pageSize));
  protected readonly totalCount = computed(() => this.products().length);

  onSort(s: SortState): void { this.sortBy.set(s.sortBy); this.sortDir.set(s.sortDir as 'asc' | 'desc'); this.page.set(1); }
  onPage(p: number): void { this.page.set(p); }
  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly canManage = this.perm.can('Inventory.Manage');

  protected readonly bottleSizes = ['20L', '18L'];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    bottleSize: ['20L', Validators.required],
    defaultRate: [0, [Validators.required, Validators.min(0)]],
    hsn: ['', [Validators.maxLength(8)]],
    isActive: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.listAll(true).subscribe({
      next: (p) => {
        this.products.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', bottleSize: '20L', defaultRate: 0, hsn: '', isActive: true });
    this.modalOpen.set(true);
  }

  openEdit(p: Product): void {
    this.editingId.set(p.id);
    this.form.reset({ name: p.name, bottleSize: p.bottleSize, defaultRate: p.defaultRate, hsn: p.hsn ?? '', isActive: p.isActive });
    this.modalOpen.set(true);
  }

  toggleActive(p: Product): void {
    this.service
      .update(p.id, { name: p.name, bottleSize: p.bottleSize, defaultRate: p.defaultRate, hsn: p.hsn ?? null, isActive: !p.isActive })
      .subscribe({
        next: () => {
          this.toast.success(this.t.instant(p.isActive ? '{{name}} deactivated.' : '{{name}} activated.', { name: p.name }));
          this.load();
        },
        error: (err) => this.toast.apiError(err, this.t.instant('Could not update the product.')),
      });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body = { name: v.name, bottleSize: v.bottleSize, defaultRate: v.defaultRate, hsn: v.hsn?.trim() || null, isActive: v.isActive };
    const id = this.editingId();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(this.t.instant(id ? 'Product updated.' : 'Product added.'));
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
        this.toast.error(Array.isArray(field) ? (field[0] as string) : this.t.instant('Could not save the product.'));
      },
    });
  }
}
