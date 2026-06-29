import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleService } from './role.service';
import { environment } from '../../../environments/environment';

describe('RoleService', () => {
  let svc: RoleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(RoleService);
    http = TestBed.inject(HttpTestingController);
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
});
