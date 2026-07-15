import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InvoiceService } from '../invoice.service';
import { CustomerService } from '../../customers/customer.service';
import { CustomerListItem } from '../../customers/customer.models';
import { TenantSettingsService } from '../../../core/services/tenant-settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { NavigationService } from '../../../core/services/navigation.service';
import { istMonth, istMonthStart, istToday } from '../../../shared/util/ist-date.util';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MobilePipe],
  templateUrl: './invoice-form.component.html',
})
export class InvoiceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InvoiceService);
  private readonly customers = inject(CustomerService);
  private readonly tenantSettings = inject(TenantSettingsService);
  private readonly router = inject(Router);
  private readonly nav = inject(NavigationService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly customerResults = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomer = signal<CustomerListItem | null>(null);
  protected readonly saving = signal(false);

  /** GST config for the notice line — so it matches what will actually be charged. */
  protected readonly gst = signal<{ enabled: boolean; percent: number } | null>(null);

  /** 'month' = whole calendar month (quick); 'custom' = explicit From/To range. */
  protected readonly periodMode = signal<'month' | 'custom'>('month');

  protected readonly customerSearch = this.fb.nonNullable.control('');
  protected readonly form = this.fb.nonNullable.group({
    month: [istMonth(), Validators.required], // YYYY-MM
    fromDate: [istMonthStart()], // YYYY-MM-DD, defaults to 1st of this month
    toDate: [istToday()], // defaults to today
    notes: [''],
  });

  setPeriodMode(mode: 'month' | 'custom'): void {
    this.periodMode.set(mode);
  }

  constructor() {
    // Only the GST config, so an Accountant (Invoices.Create without BusinessProfile.View) still sees the
    // notice — and nobody pulls the owner's contact details just to render one line.
    this.tenantSettings.billing().subscribe((s) => {
      if (s) this.gst.set({ enabled: s.gstEnabled, percent: s.gstPercent });
    });

    this.customerSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        if (term.trim()) {
          this.customers.list({ search: term, page: 1, pageSize: 8 }).subscribe((r) => this.customerResults.set(r.items));
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

  private periodOf(month: string): { from: string; to: string } {
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const last = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month
    const to = `${month}-${String(last).padStart(2, '0')}`;
    return { from, to };
  }

  generate(): void {
    const customer = this.selectedCustomer();
    if (!customer) {
      this.toast.error(this.t.instant('Please select a customer.'));
      return;
    }
    if (this.form.invalid || this.saving()) return;

    let from: string;
    let to: string;
    if (this.periodMode() === 'custom') {
      from = this.form.controls.fromDate.value;
      to = this.form.controls.toDate.value;
      if (!from || !to) {
        this.toast.error(this.t.instant('Please choose a start and end date.'));
        return;
      }
      if (to < from) {
        this.toast.error(this.t.instant('The end date must be on or after the start date.'));
        return;
      }
    } else {
      ({ from, to } = this.periodOf(this.form.controls.month.value));
    }

    this.saving.set(true);
    this.service
      .generate({ customerId: customer.id, periodFrom: from, periodTo: to, notes: this.form.controls.notes.value || null })
      .subscribe({
        next: (res) => {
          this.toast.success(this.t.instant('Invoice generated.'));
          // replaceUrl: drop the generate form from history, else Back returns to it and generates
          // a second invoice for the same period.
          this.router.navigate(['/invoices', res.id], { replaceUrl: true });
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
          this.toast.error(Array.isArray(field) ? field[0] : this.t.instant('No delivered orders found for this period.'));
        },
      });
  }

  cancel(): void {
    this.nav.back('/invoices');
  }
}
