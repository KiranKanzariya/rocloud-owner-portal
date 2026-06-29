import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserService, UserListItem } from '../../../core/services/user.service';
import { RoleService, Role } from '../../../core/services/role.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { CanDirective } from '../../../shared/directives/can.directive';
import { UserFormModalComponent } from './user-form-modal/user-form-modal.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { DataTableComponent, ColumnDef, SortState } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { sortAndPage } from '../../../shared/components/data-table/client-table';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, CanDirective, UserFormModalComponent, TranslatePipe, MobilePipe, DataTableComponent, ColumnCellDirective],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  private readonly users = inject(UserService);
  private readonly rolesSvc = inject(RoleService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly all = signal<UserListItem[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly loading = signal(false);

  // Client-side sort + paginate for the shared data table.
  protected readonly columns: ColumnDef[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'mobile', header: 'Mobile' },
    { key: 'roleName', header: 'Role', sortable: true },
    { key: 'areas', header: 'Areas' },
    { key: 'lastLoginAt', header: 'Last login', sortable: true },
    { key: 'isActive', header: 'Status', sortable: true },
    { key: 'actions', header: '', align: 'right', width: '110px' },
  ];
  protected readonly sortBy = signal('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly rows = computed(() => sortAndPage(this.all(), this.sortBy(), this.sortDir(), this.page(), this.pageSize));
  protected readonly totalCount = computed(() => this.all().length);

  onSort(s: SortState): void { this.sortBy.set(s.sortBy); this.sortDir.set(s.sortDir as 'asc' | 'desc'); this.page.set(1); }
  onPage(p: number): void { this.page.set(p); }
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<UserListItem | null>(null);
  protected readonly canManage = this.perm.can('Users.Manage');

  constructor() {
    this.load();
    // Roles power the Add/Edit role dropdown. Needs Roles.Manage — degrade to [] otherwise.
    this.rolesSvc.list().subscribe({ next: (r) => this.roles.set(r), error: () => this.roles.set([]) });
  }

  load(): void {
    this.loading.set(true);
    this.users.list({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.all.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  add(): void {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  edit(u: UserListItem): void {
    this.editing.set(u);
    this.modalOpen.set(true);
  }

  onSaved(): void {
    this.modalOpen.set(false);
    this.load();
  }

  deactivate(u: UserListItem): void {
    if (!confirm(this.t.instant('Deactivate {{name}}? They will lose access immediately.', { name: u.name }))) return;
    this.users.deactivate(u.id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('{{name}} deactivated.', { name: u.name }));
        this.load();
      },
      error: () => this.toast.error(this.t.instant('Could not deactivate the user.')),
    });
  }

  resetPassword(u: UserListItem): void {
    this.users.resetPassword(u.id).subscribe({
      next: () => this.toast.success(this.t.instant('Password reset email sent to {{name}}.', { name: u.name })),
      error: () => this.toast.error(this.t.instant('Could not reset the password.')),
    });
  }

  areaNames(u: UserListItem): string {
    return u.areas.length ? u.areas.map((a) => a.areaName).join(', ') : '—';
  }
}
