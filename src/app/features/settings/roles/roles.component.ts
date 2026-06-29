import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoleService, Role, Permission } from '../../../core/services/role.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { CanPlanDirective } from '../../../shared/directives/can.directive';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface PermGroup {
  module: string;
  permissions: Permission[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule, CanPlanDirective, TranslatePipe],
  templateUrl: './roles.component.html',
})
export class RolesComponent {
  private readonly service = inject(RoleService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly roles = signal<Role[]>([]);
  protected readonly allPermissions = signal<Permission[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** Working copy of the selected role's permission codes (edited via the matrix). */
  protected readonly draft = signal<Set<string>>(new Set());

  protected readonly createOpen = signal(false);
  protected newRoleName = '';
  protected readonly newRoleDraft = signal<Set<string>>(new Set());

  protected readonly groups = computed<PermGroup[]>(() => {
    const byModule = new Map<string, Permission[]>();
    for (const p of this.allPermissions()) {
      const list = byModule.get(p.module) ?? [];
      list.push(p);
      byModule.set(p.module, list);
    }
    return [...byModule.entries()].map(([module, permissions]) => ({ module, permissions }));
  });

  protected readonly selected = computed(() => this.roles().find((r) => r.id === this.selectedId()) ?? null);
  protected readonly editable = computed(() => this.selected()?.isCustom === true);

  constructor() {
    this.service.permissions().subscribe((p) => this.allPermissions.set(p));
    this.load();
  }

  load(): void {
    this.service.list().subscribe((r) => {
      this.roles.set(r);
      if (!this.selectedId() && r.length) this.select(r[0]);
      else {
        const cur = r.find((x) => x.id === this.selectedId());
        if (cur) this.draft.set(new Set(cur.permissions));
      }
    });
  }

  select(role: Role): void {
    this.selectedId.set(role.id);
    this.draft.set(new Set(role.permissions));
  }

  has(code: string): boolean {
    return this.draft().has(code);
  }

  toggle(code: string): void {
    if (!this.editable()) return;
    const next = new Set(this.draft());
    next.has(code) ? next.delete(code) : next.add(code);
    this.draft.set(next);
  }

  savePermissions(): void {
    const role = this.selected();
    if (!role || !this.editable() || this.saving()) return;
    this.saving.set(true);
    this.service.updatePermissions(role.id, [...this.draft()]).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.t.instant('Permissions updated for {{name}}.', { name: role.name }));
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.t.instant('Could not update permissions.'));
      },
    });
  }

  deleteRole(): void {
    const role = this.selected();
    if (!role || !role.isCustom) return;
    if (!confirm(this.t.instant('Delete the "{{name}}" role?', { name: role.name }))) return;
    this.service.delete(role.id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('Role deleted.'));
        this.selectedId.set(null);
        this.load();
      },
      error: () => this.toast.error(this.t.instant('Could not delete the role (it may have users assigned).')),
    });
  }

  // ── Create custom role ────────────────────────────────────────────────
  openCreate(): void {
    this.newRoleName = '';
    this.newRoleDraft.set(new Set());
    this.createOpen.set(true);
  }

  hasNew(code: string): boolean {
    return this.newRoleDraft().has(code);
  }

  toggleNew(code: string): void {
    const next = new Set(this.newRoleDraft());
    next.has(code) ? next.delete(code) : next.add(code);
    this.newRoleDraft.set(next);
  }

  createRole(): void {
    if (!this.newRoleName.trim() || this.saving()) {
      this.toast.error(this.t.instant('Enter a role name.'));
      return;
    }
    this.saving.set(true);
    this.service.create(this.newRoleName.trim(), [...this.newRoleDraft()]).subscribe({
      next: () => {
        this.saving.set(false);
        this.createOpen.set(false);
        this.toast.success(this.t.instant('Custom role created.'));
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.t.instant('Could not create the role.'));
      },
    });
  }
}
