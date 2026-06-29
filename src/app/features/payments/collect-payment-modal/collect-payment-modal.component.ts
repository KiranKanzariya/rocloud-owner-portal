import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaymentService } from '../../../core/services/payment.service';
import { CustomerService } from '../../customers/customer.service';
import { CustomerListItem } from '../../customers/customer.models';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

@Component({
  selector: 'app-collect-payment-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MobilePipe],
  templateUrl: './collect-payment-modal.component.html',
})
export class CollectPaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payments = inject(PaymentService);
  private readonly customers = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly open = input(false);
  /** When set, the payment is recorded for this customer and the search is hidden (e.g. from a customer page). */
  readonly presetCustomer = input<{ id: string; name: string; mobile: string | null } | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly methods = ['Cash', 'UPI', 'Card', 'Online', 'BankTransfer'];
  protected readonly saving = signal(false);
  protected readonly customerResults = signal<CustomerListItem[]>([]);
  // Only id/name/mobile are needed, so a search result or a preset both fit.
  protected readonly selectedCustomer = signal<{ id: string; name: string; mobile: string | null } | null>(null);
  /** The customer the payment applies to: an explicit pick wins, else the preset from the host page. */
  protected readonly effectiveCustomer = computed(() => this.selectedCustomer() ?? this.presetCustomer());

  protected readonly customerSearch = this.fb.nonNullable.control('');
  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['Cash', Validators.required],
    referenceNumber: [''],
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
    const customer = this.effectiveCustomer();
    if (!customer) {
      this.toast.error(this.t.instant('Please select a customer.'));
      return;
    }
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.payments
      .collect({
        customerId: customer.id,
        amount: v.amount,
        paymentMethod: v.paymentMethod,
        referenceNumber: v.referenceNumber || null,
        notes: v.notes || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.t.instant('Payment recorded.'));
          this.reset();
          this.saved.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.t.instant('Could not record the payment.'));
        },
      });
  }

  private reset(): void {
    this.form.reset({ amount: 0, paymentMethod: 'Cash', referenceNumber: '', notes: '' });
    this.clearCustomer();
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }
}
