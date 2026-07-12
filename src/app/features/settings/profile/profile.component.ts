import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantSettingsService, TenantSettings } from '../../../core/services/tenant-settings.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TenantSettingsService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly languages = LANGUAGES;
  protected readonly settings = signal<TenantSettings | null>(null);
  protected readonly saving = signal(false);
  protected readonly canManage = this.perm.can('BusinessProfile.Manage');
  /** Primary-colour white-labelling is an Enterprise feature (guide §24/§25). */
  protected readonly isEnterprise = this.perm.hasPlan('Enterprise');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    gstNumber: [''],
    gstEnabled: [true],
    gstPercent: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
    addressLine: [''],
    city: [''],
    state: [''],
    pincode: [''],
    logoUrl: [''],
    primaryColor: ['#0C447C'],
    defaultLanguage: ['en', Validators.required],
  });

  protected readonly initials = computed(() => {
    const n = this.settings()?.name ?? '';
    return n.split(' ').map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || 'RO';
  });

  constructor() {
    this.service.get().subscribe((s) => {
      this.settings.set(s);
      this.form.patchValue({
        name: s.name,
        gstNumber: s.gstNumber ?? '',
        gstEnabled: s.gstEnabled,
        gstPercent: s.gstPercent,
        addressLine: s.addressLine ?? '',
        city: s.city ?? '',
        state: s.state ?? '',
        pincode: s.pincode ?? '',
        logoUrl: s.logoUrl ?? '',
        primaryColor: s.primaryColor ?? '#0C447C',
        defaultLanguage: s.defaultLanguage,
      });
      if (!this.canManage) this.form.disable();
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .update({
        name: v.name,
        gstNumber: v.gstNumber || null,
        gstEnabled: v.gstEnabled,
        gstPercent: v.gstPercent,
        addressLine: v.addressLine || null,
        city: v.city || null,
        state: v.state || null,
        pincode: v.pincode || null,
        logoUrl: v.logoUrl || null,
        primaryColor: this.isEnterprise ? v.primaryColor || null : null,
        defaultLanguage: v.defaultLanguage,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.t.instant('Business profile saved.'));
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
          this.toast.error(Array.isArray(field) ? (field[0] as string) : this.t.instant('Could not save the profile.'));
        },
      });
  }
}
