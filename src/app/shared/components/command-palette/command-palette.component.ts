import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../../../core/services/permission.service';
import { LayoutService } from '../../../core/services/layout.service';
import { TranslatePipe } from '@ngx-translate/core';
import { FeatureName, isFeatureEnabled } from '../../../core/feature-flags';

interface Command {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  /** Hide unless this feature flag is on (a deferred module). */
  feature?: FeatureName;
}

const COMMANDS: Command[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard' },
  { label: 'Customers', icon: 'users', route: '/customers', permission: 'Customers.View' },
  { label: 'New customer', icon: 'user-plus', route: '/customers/new', permission: 'Customers.Create' },
  { label: 'Orders', icon: 'clipboard-list', route: '/orders', permission: 'Orders.View' },
  { label: 'New order', icon: 'plus', route: '/orders/new', permission: 'Orders.Create' },
  { label: 'Deliveries', icon: 'truck', route: '/deliveries', permission: 'Deliveries.View' },
  { label: 'Inventory', icon: 'package', route: '/inventory', permission: 'Inventory.View' },
  { label: 'Invoices', icon: 'file-invoice', route: '/invoices', permission: 'Invoices.View' },
  { label: 'Payments', icon: 'cash', route: '/payments', permission: 'Payments.View' },
  { label: 'Reports', icon: 'chart-bar', route: '/reports', permission: 'Reports.View' },
  { label: 'AMC / Service', icon: 'tool', route: '/service-requests', permission: 'AMC.View', feature: 'amcService' },
  { label: 'Users', icon: 'user-cog', route: '/settings/users', permission: 'Users.View' },
  { label: 'Subscription', icon: 'credit-card', route: '/settings/subscription' },
  { label: 'Profile', icon: 'user', route: '/settings/profile', permission: 'BusinessProfile.View' },
];

/**
 * Cmd/Ctrl+K quick-navigation palette (guide §25 polish). Lightweight route jumper — not a full
 * data search (which needs a search API). Filters by label and respects the user's permissions.
 */
@Component({
  selector: 'roc-command-palette',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './command-palette.component.html',
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly perm = inject(PermissionService);
  private readonly layout = inject(LayoutService);

  protected readonly open = this.layout.paletteOpen;
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly available = COMMANDS.filter(
    (c) => (!c.feature || isFeatureEnabled(c.feature)) && (!c.permission || this.perm.can(c.permission)),
  );

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = q ? this.available.filter((c) => c.label.toLowerCase().includes(q)) : this.available;
    return list.slice(0, 8);
  });

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.toggle();
      return;
    }
    if (!this.open()) return;

    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex.update((i) => Math.min(i + 1, this.results().length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const cmd = this.results()[this.activeIndex()];
      if (cmd) this.go(cmd);
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    this.query.set('');
    this.activeIndex.set(0);
  }

  close(): void {
    this.open.set(false);
  }

  onInput(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  go(cmd: Command): void {
    this.close();
    this.router.navigate([cmd.route]);
  }
}
