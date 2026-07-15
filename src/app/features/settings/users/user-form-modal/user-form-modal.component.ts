import { Component, computed, inject, input, output, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService, UserListItem } from '../../../../core/services/user.service';
import { Role } from '../../../../core/services/role.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobileInputComponent } from '../../../../shared/components/mobile-input/mobile-input.component';
import { isFeatureEnabled } from '../../../../core/feature-flags';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MobileInputComponent],
  templateUrl: './user-form-modal.component.html',
})
export class UserFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly open = input(false);
  /** When set, the modal edits this user; when null it creates a new one. */
  readonly editUser = input<UserListItem | null>(null);
  readonly roles = input<Role[]>([]);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly languages = LANGUAGES;
  protected readonly saving = signal(false);

  // Technician is an AMC/Service-only role, deferred with that module (feature flag `amcService`).
  // Hide it when creating; still show it for a user who already has it, so their role displays.
  protected readonly selectableRoles = computed(() => {
    const all = this.roles();
    if (isFeatureEnabled('amcService')) return all;
    const currentRoleId = this.editUser()?.roleId;
    return all.filter((r) => r.name !== 'Technician' || r.id === currentRoleId);
  });
  /** On create, send a portal invite email instead of a temp password. */
  protected readonly sendInvite = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.pattern(/^\+91[0-9]{10}$/)]],
    roleId: ['', Validators.required],
    preferredLanguage: ['en'],
    isActive: [true],
  });

  constructor() {
    effect(() => {
      const u = this.editUser();
      if (u) {
        this.form.reset({
          name: u.name,
          email: u.email ?? '',
          mobile: u.mobile ?? '',
          roleId: u.roleId ?? '',
          preferredLanguage: 'en',
          isActive: u.isActive,
        });
        this.form.controls.email.disable();
      } else {
        this.form.reset({ name: '', email: '', mobile: '', roleId: '', preferredLanguage: 'en', isActive: true });
        this.form.controls.email.enable();
      }
    });
  }

  isEdit(): boolean {
    return this.editUser() !== null;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const u = this.editUser();

    const req = u
      ? this.users.update(u.id, {
          name: v.name,
          mobile: v.mobile || null,
          roleId: v.roleId,
          isActive: v.isActive,
        })
      : this.sendInvite()
        ? this.users.invite({ name: v.name, email: v.email, mobile: v.mobile || null, roleId: v.roleId })
        : this.users.create({
            name: v.name,
            email: v.email,
            mobile: v.mobile || null,
            roleId: v.roleId,
            preferredLanguage: v.preferredLanguage,
          });

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.t.instant(u ? 'User updated.' : this.sendInvite() ? 'Invitation sent.' : 'User created.'));
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const field = err.error?.errors ? Object.values(err.error.errors)[0] : null;
        this.toast.error(Array.isArray(field) ? (field[0] as string) : this.t.instant('Could not save the user.'));
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
