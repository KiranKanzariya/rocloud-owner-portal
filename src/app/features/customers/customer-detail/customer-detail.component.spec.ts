import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CustomerDetailComponent } from './customer-detail.component';
import { PermissionService } from '../../../core/services/permission.service';

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(permissions: string): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ permissions, plan_type: 'Basic' })}.`;
}

/**
 * Customers.View gets you onto this page, but three tabs read from other modules' APIs. A role that
 * can't read them must not see the tab — otherwise it opens onto an empty list and a refused request.
 */
describe('CustomerDetailComponent — permission-gated tabs', () => {
  let perms: PermissionService;
  let http: HttpTestingController;
  let consoleWarn: typeof console.warn;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'c1' } } } },
        CustomerDetailComponent,
      ],
    });
    perms = TestBed.inject(PermissionService);
    http = TestBed.inject(HttpTestingController);

    consoleWarn = console.warn;
    console.warn = () => undefined;
  });

  afterEach(() => {
    console.warn = consoleWarn;
  });

  const tabIdsFor = (permissions: string): string[] => {
    perms.loadFromToken(makeJwt(permissions));
    const comp = TestBed.inject(CustomerDetailComponent);
    return comp['tabs']().map((t) => t.id);
  };

  it('a Manager sees every tab', () => {
    expect(tabIdsFor('Customers.View,Orders.View,Inventory.View,AMC.View')).toEqual([
      'overview',
      'subscriptions',
      'orders',
      'returns',
      'payments',
      'service',
    ]);
  });

  it('a Technician loses Order history and Return history, keeps Service requests', () => {
    expect(tabIdsFor('Customers.View,AMC.View,AMC.Update')).toEqual([
      'overview',
      'subscriptions',
      'payments',
      'service',
    ]);
  });

  it('an Accountant loses Return history and Service requests, keeps Order history', () => {
    expect(tabIdsFor('Customers.View,Orders.View,Payments.View,Invoices.View')).toEqual([
      'overview',
      'subscriptions',
      'orders',
      'payments',
    ]);
  });

  it('selectTab refuses a hidden tab, so its fetch never fires', () => {
    perms.loadFromToken(makeJwt('Customers.View,AMC.View'));
    const comp = TestBed.inject(CustomerDetailComponent);

    comp.selectTab('orders');

    expect(comp['tab']()).toBe('overview');
    expect(http.match((r) => r.url.includes('/orders'))).toEqual([]);
  });
});
