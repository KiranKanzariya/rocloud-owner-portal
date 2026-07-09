import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ServiceRequestService } from '../service-request.service';
import { SERVICE_PRIORITIES, SERVICE_TYPES } from '../service-request.models';
import { CustomerService } from '../../customers/customer.service';
import { CustomerListItem } from '../../customers/customer.models';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

@Component({
  selector: 'app-service-request-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MobilePipe],
  templateUrl: './service-request-form-modal.component.html',
})
export class ServiceRequestFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ServiceRequestService);
  private readonly customers = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly open = input(false);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly types = SERVICE_TYPES;
  protected readonly priorities = SERVICE_PRIORITIES;
  protected readonly saving = signal(false);
  protected readonly customerResults = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomer = signal<CustomerListItem | null>(null);

  protected readonly customerSearch = this.fb.nonNullable.control('');
  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    serviceType: ['Complaint', Validators.required],
    priority: ['Medium', Validators.required],
    scheduledDate: [''],
    description: [''],
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
    const customer = this.selectedCustomer();
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
    this.service
      .create({
        customerId: customer.id,
        title: v.title,
        serviceType: v.serviceType,
        priority: v.priority,
        scheduledDate: v.scheduledDate || null,
        description: v.description || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.t.instant('Service request created.'));
          this.reset();
          this.saved.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.apiError(err, this.t.instant('Could not create the request.'));
        },
      });
  }

  private reset(): void {
    this.form.reset({ title: '', serviceType: 'Complaint', priority: 'Medium', scheduledDate: '', description: '' });
    this.clearCustomer();
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }
}
