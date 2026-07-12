import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AreaService, Area } from '../../../core/services/area.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DataTableComponent, ColumnDef, SortState } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { sortAndPage } from '../../../shared/components/data-table/client-table';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, DataTableComponent, ColumnCellDirective],
  templateUrl: './areas.component.html',
})
export class AreasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AreaService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly areas = signal<Area[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  // Client-side sort + paginate for the shared data table.
  protected readonly columns: ColumnDef[] = [
    { key: 'name', header: 'Area', sortable: true },
    { key: 'city', header: 'City', sortable: true },
    { key: 'pincode', header: 'Pincode' },
    { key: 'customerCount', header: 'Customers', sortable: true, align: 'right' },
    { key: 'isActive', header: 'Status', sortable: true },
    { key: 'actions', header: '', align: 'right', width: '90px' },
  ];
  protected readonly sortBy = signal('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly rows = computed(() => sortAndPage(this.areas(), this.sortBy(), this.sortDir(), this.page(), this.pageSize));
  protected readonly totalCount = computed(() => this.areas().length);

  onSort(s: SortState): void { this.sortBy.set(s.sortBy); this.sortDir.set(s.sortDir as 'asc' | 'desc'); this.page.set(1); }
  onPage(p: number): void { this.page.set(p); }
  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly canManage = this.perm.can('Areas.Manage');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    city: [''],
    pincode: [''],
    isActive: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(true).subscribe({
      next: (a) => {
        this.areas.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', city: '', pincode: '', isActive: true });
    this.modalOpen.set(true);
  }

  openEdit(a: Area): void {
    this.editingId.set(a.id);
    this.form.reset({ name: a.name, city: a.city ?? '', pincode: a.pincode ?? '', isActive: a.isActive });
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body = { name: v.name, city: v.city || null, pincode: v.pincode || null, isActive: v.isActive };
    const id = this.editingId();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(this.t.instant(id ? 'Area updated.' : 'Area added.'));
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
        this.toast.error(Array.isArray(field) ? (field[0] as string) : this.t.instant('Could not save the area.'));
      },
    });
  }

  remove(a: Area): void {
    if (!confirm(this.t.instant('Delete area "{{name}}"? This cannot be undone.', { name: a.name }))) return;
    this.service.delete(a.id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('Area deleted.'));
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
        this.toast.error(Array.isArray(field) ? (field[0] as string) : this.t.instant('Could not delete the area.'));
      },
    });
  }
}
