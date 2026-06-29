import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { planGuard } from './core/guards/plan.guard';

export const routes: Routes = [
  // ── Public auth screens ──────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'find-workspace',
    loadComponent: () =>
      import('./features/auth/find-workspace/find-workspace.component').then((m) => m.FindWorkspaceComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  // Apex Google sign-in (renders the GIS button on the central domain, resolves the workspace).
  {
    path: 'google-signin',
    loadComponent: () =>
      import('./features/auth/google-signin/google-signin.component').then((m) => m.GoogleSigninComponent),
  },
  // Tenant-subdomain landing that exchanges a one-time Google handoff grant for a session.
  {
    path: 'auth/handoff',
    loadComponent: () => import('./features/auth/handoff/handoff.component').then((m) => m.HandoffComponent),
  },
  // Platform "Open as owner" landing — signs in as the tenant owner from the token in the URL fragment.
  {
    path: 'impersonate',
    loadComponent: () => import('./features/auth/impersonate/impersonate.component').then((m) => m.ImpersonateComponent),
  },

  // ── Authenticated shell ──────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // Operations
      {
        path: 'customers',
        canActivate: [permissionGuard],
        data: { permission: 'Customers.View' },
        loadComponent: () =>
          import('./features/customers/customer-list/customer-list.component').then((m) => m.CustomerListComponent),
      },
      {
        path: 'customers/new',
        canActivate: [permissionGuard],
        data: { permission: 'Customers.Create' },
        loadComponent: () =>
          import('./features/customers/customer-form/customer-form.component').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'customers/import',
        canActivate: [permissionGuard],
        data: { permission: 'Customers.Create', title: 'Import customers' },
        loadComponent: () =>
          import('./features/customers/customer-import/customer-import.component').then((m) => m.CustomerImportComponent),
      },
      {
        path: 'customers/:id',
        canActivate: [permissionGuard],
        data: { permission: 'Customers.View' },
        loadComponent: () =>
          import('./features/customers/customer-detail/customer-detail.component').then((m) => m.CustomerDetailComponent),
      },
      {
        path: 'customers/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'Customers.Edit' },
        loadComponent: () =>
          import('./features/customers/customer-form/customer-form.component').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'orders',
        canActivate: [permissionGuard],
        data: { permission: 'Orders.View' },
        loadComponent: () => import('./features/orders/order-list/order-list.component').then((m) => m.OrderListComponent),
      },
      {
        path: 'orders/new',
        canActivate: [permissionGuard],
        data: { permission: 'Orders.Create' },
        loadComponent: () => import('./features/orders/order-form/order-form.component').then((m) => m.OrderFormComponent),
      },
      {
        path: 'orders/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'Orders.Edit' },
        loadComponent: () => import('./features/orders/order-form/order-form.component').then((m) => m.OrderFormComponent),
      },
      {
        path: 'orders/:id',
        canActivate: [permissionGuard],
        data: { permission: 'Orders.View' },
        loadComponent: () => import('./features/orders/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
      },
      {
        path: 'deliveries',
        canActivate: [permissionGuard],
        data: { permission: 'Deliveries.View' },
        loadComponent: () =>
          import('./features/deliveries/delivery-board/delivery-board.component').then((m) => m.DeliveryBoardComponent),
      },
      {
        path: 'deliveries/map',
        canActivate: [permissionGuard],
        data: { permission: 'Deliveries.View' },
        loadComponent: () =>
          import('./features/deliveries/delivery-map/delivery-map.component').then((m) => m.DeliveryMapComponent),
      },
      {
        // Delivery boy's own stops (Deliveries.ViewOwn) — the mobile route screen.
        path: 'my-route',
        canActivate: [permissionGuard],
        data: { permission: 'Deliveries.ViewOwn' },
        loadComponent: () =>
          import('./features/deliveries/my-route/my-route.component').then((m) => m.MyRouteComponent),
      },
      {
        path: 'inventory',
        canActivate: [permissionGuard],
        data: { permission: 'Inventory.View' },
        loadComponent: () => import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
      },

      // Finance
      {
        path: 'invoices',
        canActivate: [permissionGuard],
        data: { permission: 'Invoices.View' },
        loadComponent: () => import('./features/invoices/invoice-list/invoice-list.component').then((m) => m.InvoiceListComponent),
      },
      {
        path: 'invoices/new',
        canActivate: [permissionGuard],
        data: { permission: 'Invoices.Create' },
        loadComponent: () => import('./features/invoices/invoice-form/invoice-form.component').then((m) => m.InvoiceFormComponent),
      },
      {
        path: 'invoices/:id',
        canActivate: [permissionGuard],
        data: { permission: 'Invoices.View' },
        loadComponent: () => import('./features/invoices/invoice-detail/invoice-detail.component').then((m) => m.InvoiceDetailComponent),
      },
      {
        path: 'payments',
        canActivate: [permissionGuard],
        data: { permission: 'Payments.View', title: 'Payments', icon: 'cash' },
        loadComponent: () => import('./features/payments/payments.component').then((m) => m.PaymentsComponent),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard, planGuard],
        data: { permission: 'Reports.View', plan: 'Pro', title: 'Reports', icon: 'chart-bar' },
        // Chart.js is provided here so it lazy-loads with the Reports chunk (keeps main bundle small).
        providers: [provideCharts(withDefaultRegisterables())],
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },

      // Service
      {
        path: 'service-requests',
        canActivate: [permissionGuard],
        data: { permission: 'AMC.View', title: 'AMC / Service', icon: 'tool' },
        loadComponent: () =>
          import('./features/service-requests/service-requests.component').then((m) => m.ServiceRequestsComponent),
      },

      // Settings
      {
        path: 'settings/users',
        canActivate: [permissionGuard],
        data: { permission: 'Users.View', title: 'Users', icon: 'user-cog' },
        loadComponent: () => import('./features/settings/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings/roles',
        canActivate: [permissionGuard],
        data: { permission: 'Roles.Manage', title: 'Roles', icon: 'shield' },
        loadComponent: () => import('./features/settings/roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'settings/products',
        canActivate: [permissionGuard],
        data: { permission: 'Inventory.Manage', title: 'Products', icon: 'bottle' },
        loadComponent: () => import('./features/settings/products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'settings/areas',
        canActivate: [permissionGuard],
        data: { permission: 'Settings.View', title: 'Areas', icon: 'map-pin' },
        loadComponent: () => import('./features/settings/areas/areas.component').then((m) => m.AreasComponent),
      },
      {
        path: 'settings/notifications',
        canActivate: [permissionGuard],
        data: { permission: 'Settings.View', title: 'Notifications', icon: 'bell' },
        loadComponent: () =>
          import('./features/settings/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'settings/profile',
        canActivate: [permissionGuard],
        data: { permission: 'Settings.View', title: 'Profile', icon: 'user' },
        loadComponent: () => import('./features/settings/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'settings/subscription',
        data: { title: 'Subscription', icon: 'credit-card' },
        loadComponent: () =>
          import('./features/settings/subscription/subscription.component').then((m) => m.SubscriptionComponent),
      },
      {
        path: 'settings/activity',
        canActivate: [permissionGuard],
        data: { ownerOnly: true, title: 'Activity log', icon: 'history' },
        loadComponent: () =>
          import('./features/settings/activity/activity.component').then((m) => m.ActivityComponent),
      },

      // Guard fallbacks
      {
        path: 'upgrade',
        loadComponent: () => import('./features/upgrade/upgrade.component').then((m) => m.UpgradeComponent),
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./features/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
