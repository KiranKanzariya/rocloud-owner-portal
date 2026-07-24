import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomerService } from '../customer.service';
import { CustomerActions } from '../customer.constants';
import { CustomerUpsert } from '../customer.models';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BottleSize } from '../../../core/models/bottle-size';
import { MobileInputComponent } from '../../../shared/components/mobile-input/mobile-input.component';
import { NavigationService } from '../../../core/services/navigation.service';
import { Area, AreaService } from '../../../core/services/area.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MobileInputComponent],
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CustomerService);
  private readonly areaService = inject(AreaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly nav = inject(NavigationService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly deliveryModes = CustomerActions.deliveryModes;
  protected readonly paymentPreferences = CustomerActions.paymentPreferences;
  protected readonly bottleSizes = CustomerActions.bottleSizes;

  protected readonly id = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = signal(!!this.id());
  protected readonly saving = signal(false);

  /** Active delivery areas for the picker. Optional — '' means "no area". */
  protected readonly areas = signal<Area[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    areaId: [''],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200), Validators.pattern(/^[\p{L}\p{N}\s.\-,']+$/u)]],
    // Optional: an owner may not have a number for every customer (a shop, an old book entry).
    mobile: ['', [Validators.pattern(/^\+91[0-9]{10}$/)]],
    alternateMobile: ['', [Validators.pattern(/^\+91[0-9]{10}$/)]],
    email: ['', [Validators.email, Validators.maxLength(200)]],
    addressLine: ['', [Validators.maxLength(500)]],
    landmark: ['', [Validators.maxLength(200)]],
    deliveryMode: ['HomeDelivery', Validators.required],
    paymentPreference: ['PerBottle', Validators.required],
    preferredBottleSize: ['20L' as BottleSize | ''],
    notes: [''],
    isActive: [true],
  });

  constructor() {
    this.areaService.list().subscribe((a) => this.areas.set(a));

    const id = this.id();
    if (id) {
      this.service.get(id).subscribe((c) => {
        this.form.patchValue({
          areaId: c.areaId ?? '',
          name: c.name,
          mobile: c.mobile ?? '',
          alternateMobile: c.alternateMobile ?? '',
          email: c.email ?? '',
          addressLine: c.addressLine ?? '',
          landmark: c.landmark ?? '',
          deliveryMode: c.deliveryMode,
          paymentPreference: c.paymentPreference,
          preferredBottleSize: (c.preferredBottleSize as BottleSize) ?? '',
          notes: c.notes ?? '',
          isActive: c.isActive,
        });
      });
    }
  }

  pickBottle(size: BottleSize): void {
    this.form.controls.preferredBottleSize.setValue(size);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: CustomerUpsert = {
      areaId: v.areaId || null,
      name: v.name,
      mobile: v.mobile || null,
      alternateMobile: v.alternateMobile || null,
      email: v.email || null,
      addressLine: v.addressLine || null,
      landmark: v.landmark || null,
      deliveryMode: v.deliveryMode,
      paymentPreference: v.paymentPreference,
      preferredBottleSize: v.preferredBottleSize || null,
      notes: v.notes || null,
      isActive: v.isActive,
    };

    const id = this.id();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: (res) => {
        this.toast.success(this.t.instant(id ? 'Customer updated.' : 'Customer created.'));
        if (id) {
          // Edit: return to wherever the form was opened from (usually the customer's own page, which
          // is already the entry behind us). POP rather than navigate — a replaceUrl navigate would put
          // the detail directly behind the detail, so the first Back would appear to do nothing.
          this.nav.back(['/customers', id]);
        } else {
          // Create: the new customer's page isn't in history yet, so navigate — replaceUrl drops the
          // form, otherwise Back returns to the still-filled Add form and could create a DUPLICATE.
          this.router.navigate(['/customers', res.id], { replaceUrl: true });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
        this.toast.error(Array.isArray(field) ? field[0] : this.t.instant('Could not save the customer.'));
      },
    });
  }

  cancel(): void {
    // Pop history rather than navigate() — a push would leave the form BEHIND the page we return to,
    // so Back from there would land on the form again. Falls back on a direct load / refresh.
    const id = this.id();
    this.nav.back(id ? ['/customers', id] : '/customers');
  }
}
