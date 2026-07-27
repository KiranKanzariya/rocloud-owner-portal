import { Component, computed, inject, input, output, effect, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService, UserListItem } from '../../../../core/services/user.service';
import { Role } from '../../../../core/services/role.service';
import { AreaService, Area } from '../../../../core/services/area.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobileInputComponent } from '../../../../shared/components/mobile-input/mobile-input.component';
import { isFeatureEnabled } from '../../../../core/feature-flags';
import { ModalDirective } from '../../../../shared/directives/modal.directive';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

/** Only this role drives order auto-assignment (DeliveryBoyResolver matches on the role name). */
const DELIVERY_BOY_ROLE = 'DeliveryBoy';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ModalDirective, ReactiveFormsModule, TranslatePipe, MobileInputComponent],
  templateUrl: './user-form-modal.component.html',
})
export class UserFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly areaSvc = inject(AreaService);
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

  /** All areas (incl. inactive, so an already-assigned inactive area still renders). Needs Areas.View. */
  private readonly allAreas = signal<Area[]>([]);
  private areasLoaded = false;
  /** Selected area ids — kept outside the form so the checkbox list is plain signal state. */
  protected readonly selectedAreas = signal<string[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.pattern(/^\+91[0-9]{10}$/)]],
    roleId: ['', Validators.required],
    preferredLanguage: ['en'],
    isActive: [true],
  });

  /** Live role selection, so the areas block appears the moment "Delivery boy" is picked. */
  private readonly roleId = toSignal(this.form.controls.roleId.valueChanges, { initialValue: '' });

  /**
   * Area mapping only affects delivery boys (see DeliveryBoyResolver). Still show the block for a user
   * who already has areas, so a role change never hides — and silently keeps — an existing mapping.
   */
  protected readonly showAreas = computed(() => {
    const id = this.roleId();
    if (this.roles().some((r) => r.id === id && r.name === DELIVERY_BOY_ROLE)) return true;
    return (this.editUser()?.areas.length ?? 0) > 0;
  });

  /** Active areas, plus any inactive one this user is already assigned to. */
  protected readonly areaOptions = computed(() => {
    const selected = this.selectedAreas();
    return this.allAreas().filter((a) => a.isActive || selected.includes(a.id));
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
        this.selectedAreas.set(u.areas.map((a) => a.areaId));
        this.form.controls.email.disable();
      } else {
        this.form.reset({ name: '', email: '', mobile: '', roleId: '', preferredLanguage: 'en', isActive: true });
        this.selectedAreas.set([]);
        this.form.controls.email.enable();
      }
    });

    // The modal stays mounted on the users page — fetch areas on first open, not on every page load.
    effect(() => {
      if (!this.open() || this.areasLoaded) return;
      this.areasLoaded = true;
      this.areaSvc
        .list(true)
        .pipe(catchError(() => of([] as Area[])))   // no Areas.View — degrade to an empty list
        .subscribe((a) => this.allAreas.set(a));
    });
  }

  protected hasArea(id: string): boolean {
    return this.selectedAreas().includes(id);
  }

  protected toggleArea(id: string): void {
    this.selectedAreas.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
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

    // Always sent: the API replaces the whole area set, so omitting it on edit would wipe the mapping.
    const areaIds = this.selectedAreas();

    const req = u
      ? this.users.update(u.id, {
          name: v.name,
          mobile: v.mobile || null,
          roleId: v.roleId,
          isActive: v.isActive,
          areaIds,
        })
      : this.sendInvite()
        ? this.users.invite({ name: v.name, email: v.email, mobile: v.mobile || null, roleId: v.roleId, areaIds })
        : this.users.create({
            name: v.name,
            email: v.email,
            mobile: v.mobile || null,
            roleId: v.roleId,
            preferredLanguage: v.preferredLanguage,
            areaIds,
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
