import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InventoryService } from '../inventory.service';
import { InventorySummary } from '../inventory.models';
import { CustomerService } from '../../customers/customer.service';
import { CustomerListItem } from '../../customers/customer.models';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

@Component({
  selector: 'app-stock-entry-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MobilePipe],
  templateUrl: './stock-entry-modal.component.html',
})
export class StockEntryModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InventoryService);
  private readonly customers = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly open = input(false);
  readonly products = input<InventorySummary[]>([]);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly types = ['Issue', 'Return', 'Damage', 'Restock', 'Adjustment'];
  protected readonly saving = signal(false);
  protected readonly customerResults = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomer = signal<CustomerListItem | null>(null);

  protected readonly customerSearch = this.fb.nonNullable.control('');
  protected readonly form = this.fb.nonNullable.group({
    movementType: ['Restock', Validators.required],
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  constructor() {
    this.customerSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        if (term.trim()) {
          this.customers.list({ search: term, page: 1, pageSize: 6 }).subscribe((r) => this.customerResults.set(r.items));
        } else {
          this.customerResults.set([]);
        }
      });
  }

  selectCustomer(c: CustomerListItem): void {
    this.selectedCustomer.set(c);
    this.customerResults.set([]);
    this.customerSearch.setValue(c.name, { emitEvent: false });
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerSearch.setValue('');
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .addMovement({
        movementType: v.movementType,
        productId: v.productId,
        quantity: v.quantity,
        customerId: this.selectedCustomer()?.id ?? null,
        notes: v.notes || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.t.instant('Stock movement recorded.'));
          this.reset();
          this.saved.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.t.instant('Could not record the movement.'));
        },
      });
  }

  private reset(): void {
    this.form.reset({ movementType: 'Restock', productId: '', quantity: 1, notes: '' });
    this.clearCustomer();
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }
}
