import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardComponent } from './dashboard.component';
import { PermissionService } from '../../core/services/permission.service';

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(permissions: string): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ permissions, plan_type: 'Basic' })}.`;
}

/**
 * The dashboard is the landing page for every role, so it must never ask for data the current role
 * cannot read — a Technician used to fire all five widget requests and be refused all five.
 * Constructing the component (without rendering) is enough: the fetches run in its constructor.
 */
describe('DashboardComponent — permission-gated widgets', () => {
  let http: HttpTestingController;
  let perms: PermissionService;
  let consoleWarn: typeof console.warn;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DashboardComponent],
    });
    http = TestBed.inject(HttpTestingController);
    perms = TestBed.inject(PermissionService);

    // guarded() warns on every skipped call in dev; keep the test output readable.
    consoleWarn = console.warn;
    console.warn = () => undefined;
  });

  afterEach(() => {
    console.warn = consoleWarn;
    http.verify();
  });

  const urlsRequested = (): string[] => {
    const reqs = http.match(() => true);
    reqs.forEach((r) => r.flush({ success: true, data: [] }));
    return reqs.map((r) => r.request.url);
  };

  it('a Technician triggers no requests at all and sees no widgets', () => {
    perms.loadFromToken(makeJwt('Customers.View,AMC.View,AMC.Update'));

    const dash = TestBed.inject(DashboardComponent);

    expect(urlsRequested()).toEqual([]);
    expect(dash['hasAnyWidget']()).toBe(false);
  });

  it('a DeliveryBoy fetches only the orders widget it may read', () => {
    perms.loadFromToken(makeJwt('Deliveries.ViewOwn,Deliveries.Update,Orders.View,Customers.View,Payments.Collect'));

    const dash = TestBed.inject(DashboardComponent);

    const urls = urlsRequested();
    expect(urls.length).toBe(1);
    expect(urls[0]).toContain('/orders');
    expect(dash['hasAnyWidget']()).toBe(true);
  });

  it('a Manager fetches every widget', () => {
    perms.loadFromToken(makeJwt('Deliveries.View,Payments.View,Orders.View,Inventory.View'));

    TestBed.inject(DashboardComponent);

    const urls = urlsRequested();
    // route summary + product-totals + payment summary + outstanding + orders + inventory
    expect(urls.length).toBe(6);
    expect(urls.some((u) => u.includes('/deliveries/product-totals'))).toBe(true);
  });
});
