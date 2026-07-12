import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';
import { environment } from '../../../environments/environment';

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.`;
}

describe('RoleService', () => {
  let svc: RoleService;
  let http: HttpTestingController;
  let perms: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(RoleService);
    http = TestBed.inject(HttpTestingController);
    perms = TestBed.inject(PermissionService);
    perms.loadFromToken(makeJwt({ permissions: 'Roles.View', plan_type: 'Enterprise' }));
  });

  afterEach(() => http.verify());

  it('list() reads the RAW array (no ApiResponse envelope)', () => {
    let count: number | undefined;
    svc.list().subscribe((r) => (count = r.length));
    const req = http.expectOne(`${environment.apiUrl}/roles`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'r1', name: 'Owner', isSystem: true, isCustom: false, permissions: [] }]);
    expect(count).toBe(1);
  });

  it('permissions() reads the RAW permission array', () => {
    let count: number | undefined;
    svc.permissions().subscribe((p) => (count = p.length));
    const req = http.expectOne(`${environment.apiUrl}/roles/permissions`);
    req.flush([{ id: 'p1', module: 'Customers', action: 'View', code: 'Customers.View' }]);
    expect(count).toBe(1);
  });

  it('create() POSTs name + permissions', () => {
    svc.create('Accountant', ['Payments.View']).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Accountant');
    expect(req.request.body.permissions).toEqual(['Payments.View']);
    req.flush({ id: 'r2' });
  });

  it('updatePermissions() PUTs the codes', () => {
    svc.updatePermissions('r2', ['Orders.View']).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/roles/r2/permissions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.permissions).toEqual(['Orders.View']);
    req.flush(null);
  });

  it('list() sends no request and yields [] without Roles.View — a 403 toast never fires', () => {
    perms.loadFromToken(makeJwt({ permissions: 'Users.View', plan_type: 'Basic' }));

    let result: unknown;
    svc.list().subscribe((r) => (result = r));

    http.expectNone(`${environment.apiUrl}/roles`);
    expect(result).toEqual([]);
  });

  it('list() still calls the API for a legacy token holding only Roles.Manage', () => {
    perms.loadFromToken(makeJwt({ permissions: 'Roles.Manage', plan_type: 'Basic' }));

    svc.list().subscribe();
    http.expectOne(`${environment.apiUrl}/roles`).flush([]);
  });
});
