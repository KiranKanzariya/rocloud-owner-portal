import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product';
import { ToastService } from '../../../core/services/toast.service';
import { TenantSettingsService } from '../../../core/services/tenant-settings.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { istToday, istTodayMinusDays } from '../../../shared/util/ist-date.util';

/**
 * Records empty jars a customer handed back when there's no delivery to attach them to (moved house,
 * missed on the day). Hosted with a preset customer (e.g. the customer detail page). Mirrors the collect-
 * payment modal; the date may be backdated within the platform window (server-enforced).
 */
@Component({
  selector: 'app-record-return-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './record-return-modal.component.html',
})
export class RecordReturnModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly inventory = inject(InventoryService);
  private readonly productsApi = inject(ProductService);
  private readonly settings = inject(TenantSettingsService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly open = input(false);
  readonly customer = input<{ id: string; name: string } | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly products = signal<Product[]>([]);

  protected readonly todayIso = istToday();
  protected readonly earliestReturnedOn = signal(this.todayIso);

  protected readonly form = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    returnedOn: [this.todayIso],
    notes: [''],
  });

  constructor() {
    this.productsApi.list().subscribe((p) => this.products.set(p));
    this.settings.backdateWindowDays().subscribe((days) => this.earliestReturnedOn.set(istTodayMinusDays(days)));
  }

  submit(): void {
    const customer = this.customer();
    if (!customer) {
      this.toast.error(this.t.instant('No customer selected.'));
      return;
    }
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.inventory
      .recordCustomerReturn({
        customerId: customer.id,
        productId: v.productId,
        quantity: v.quantity,
        // Omit when it's today so a same-day return keeps its exact time-of-day server-side.
        returnedOn: v.returnedOn && v.returnedOn !== this.todayIso ? v.returnedOn : null,
        notes: v.notes || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.t.instant('Return recorded.'));
          this.reset();
          this.saved.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.apiError(err, this.t.instant('Could not record the return.'));
        },
      });
  }

  private reset(): void {
    this.form.reset({ productId: '', quantity: 1, returnedOn: this.todayIso, notes: '' });
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }
}
