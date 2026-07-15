import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PermissionService, PlanType } from '../../../core/services/permission.service';
import { LayoutService } from '../../../core/services/layout.service';
import { ActivityAvailabilityService } from '../../../core/services/activity-availability.service';
import { LogoComponent } from '../logo/logo.component';
import { FeatureName, isFeatureEnabled } from '../../../core/feature-flags';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  plan?: PlanType;
  /** Show only to the tenant's Owner role (e.g. Activity log). */
  ownerOnly?: boolean;
  /** Hide when the SuperAdmin has disabled the activity log. */
  requiresAuditEnabled?: boolean;
  /** Hide unless this feature flag is on (e.g. a module deferred to a future release). */
  feature?: FeatureName;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

@Component({
  selector: 'roc-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LogoComponent],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  protected readonly perms = inject(PermissionService);
  protected readonly layout = inject(LayoutService);
  private readonly activity = inject(ActivityAvailabilityService);

  constructor() {
    // Resolve whether the activity log is enabled so its menu item shows/hides accordingly.
    this.activity.load().subscribe();
  }

  // `label` / `heading` are i18n keys resolved by the translate pipe (see /assets/i18n).
  protected readonly sections: NavSection[] = [
    {
      heading: 'Operations',
      items: [
        { label: 'Dashboard', icon: 'ti-layout-dashboard', route: '/dashboard' },
        { label: 'Customers', icon: 'ti-users', route: '/customers', permission: 'Customers.View' },
        { label: 'Orders', icon: 'ti-clipboard-list', route: '/orders', permission: 'Orders.View' },
        { label: 'Scheduled', icon: 'ti-calendar-event', route: '/scheduled', permission: 'Orders.View' },
        { label: 'Deliveries', icon: 'ti-truck', route: '/deliveries', permission: 'Deliveries.View' },
        { label: 'My route', icon: 'ti-route', route: '/my-route', permission: 'Deliveries.ViewOwn' },
        { label: 'Inventory', icon: 'ti-package', route: '/inventory', permission: 'Inventory.View' },
      ],
    },
    {
      heading: 'Finance',
      items: [
        { label: 'Invoices', icon: 'ti-file-invoice', route: '/invoices', permission: 'Invoices.View' },
        { label: 'Payments', icon: 'ti-cash', route: '/payments', permission: 'Payments.View' },
        { label: 'Reports', icon: 'ti-chart-bar', route: '/reports', permission: 'Reports.View', plan: 'Pro' },
      ],
    },
    {
      heading: 'Service',
      items: [
        // Deferred to a future release — hidden by the `amcService` flag (empty section auto-hides).
        { label: 'AMC / Service', icon: 'ti-tool', route: '/service-requests', permission: 'AMC.View', feature: 'amcService' },
      ],
    },
    {
      heading: 'Settings',
      items: [
        { label: 'Users', icon: 'ti-user-cog', route: '/settings/users', permission: 'Users.View' },
        { label: 'Roles', icon: 'ti-shield', route: '/settings/roles', permission: 'Roles.Manage' },
        { label: 'Products', icon: 'ti-bottle', route: '/settings/products', permission: 'Inventory.Manage' },
        { label: 'Areas', icon: 'ti-map-pin', route: '/settings/areas', permission: 'Areas.View' },
        { label: 'Notifications', icon: 'ti-bell', route: '/settings/notifications', permission: 'Notifications.View' },
        { label: 'Profile', icon: 'ti-user', route: '/settings/profile', permission: 'BusinessProfile.View' },
        { label: 'Activity log', icon: 'ti-history', route: '/settings/activity', ownerOnly: true, requiresAuditEnabled: true },
        // Owner-only, like the Activity log: paying for the plan is not a permission a role can hold.
        { label: 'Subscription', icon: 'ti-credit-card', route: '/settings/subscription', ownerOnly: true },
      ],
    },
  ];

  canShow(item: NavItem): boolean {
    return (
      (!item.feature || isFeatureEnabled(item.feature)) &&
      (!item.ownerOnly || this.perms.isOwner()) &&
      (!item.permission || this.perms.can(item.permission)) &&
      (!item.plan || this.perms.hasPlan(item.plan)) &&
      (!item.requiresAuditEnabled || this.activity.enabled())
    );
  }

  /** True if a whole section has at least one visible item. */
  hasVisible(section: NavSection): boolean {
    return section.items.some((i) => this.canShow(i));
  }
}
