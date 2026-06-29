import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InventoryService } from './inventory.service';
import { environment } from '../../../environments/environment';

describe('InventoryService', () => {
  let svc: InventoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() unwraps the summary array', () => {
    let count: number | undefined;
    svc.list().subscribe((s) => (count = s.length));
    const req = http.expectOne(`${environment.apiUrl}/inventory`);
    req.flush({ success: true, data: [{ productId: 'p1', bottleSize: '20L' }, { productId: 'p2', bottleSize: '18L' }] });
    expect(count).toBe(2);
  });

  it('movements() applies the type filter', () => {
    svc.movements({ page: 1, pageSize: 25, movementType: 'Restock' }).subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/inventory/movements`);
    expect(req.request.params.get('movementType')).toBe('Restock');
    req.flush({ success: true, data: { items: [], totalCount: 0, page: 1, pageSize: 25, totalPages: 0 } });
  });

  it('addMovement() POSTs to /inventory/movements', () => {
    let id: string | undefined;
    svc.addMovement({ productId: 'p1', movementType: 'Restock', quantity: 100 }).subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/inventory/movements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.quantity).toBe(100);
    req.flush({ success: true, data: { id: 'm1' } });
    expect(id).toBe('m1');
  });
});
