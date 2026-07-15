import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
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

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, CanDirective, UserFormModalComponent, TranslatePipe, MobilePipe, DataTableComponent, ColumnCellDirective],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  private readonly users = inject(UserService);
  private readonly rolesSvc = inject(RoleService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly rows = signal<UserListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly roles = signal<Role[]>([]);
  protected readonly loading = signal(false);
  protected readonly search = new FormControl('', { nonNullable: true });

  // Server-side search + sort + paging. This page used to fetch ONE page of 100 and then sort and
  // paginate it in the browser, so a team of more than 100 lost everyone past #100 — unreachable by
  // paging, invisible to sorting, and miscounted in the footer.
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

  onSort(s: SortState): void {
    this.sortBy.set(s.sortBy);
    this.sortDir.set(s.sortDir as 'asc' | 'desc');
    this.page.set(1);
    this.load();
  }
  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<UserListItem | null>(null);
  protected readonly canManage = this.perm.can('Users.Manage');

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page.set(1);   // otherwise a search from page 3 lands on an empty page 3 of the results
        this.load();
      });
    this.load();
    // Roles power the Add/Edit role dropdown. Needs Roles.Manage — degrade to [] otherwise.
    this.rolesSvc.list().subscribe({ next: (r) => this.roles.set(r), error: () => this.roles.set([]) });
  }

  load(): void {
    this.loading.set(true);
    this.users
      .list({
        page: this.page(),
        pageSize: this.pageSize,
        search: this.search.value.trim() || undefined,
        sortBy: this.sortBy(),
        sortDir: this.sortDir(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.items);
          this.totalCount.set(res.totalCount);
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
      error: (err) => this.toast.apiError(err, this.t.instant('Could not deactivate the user.')),
    });
  }

  resetPassword(u: UserListItem): void {
    this.users.resetPassword(u.id).subscribe({
      next: () => this.toast.success(this.t.instant('Password reset email sent to {{name}}.', { name: u.name })),
      error: (err) => this.toast.apiError(err, this.t.instant('Could not reset the password.')),
    });
  }

  areaNames(u: UserListItem): string {
    return u.areas.length ? u.areas.map((a) => a.areaName).join(', ') : '—';
  }
}
