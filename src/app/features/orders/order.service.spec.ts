import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { environment } from '../../../environments/environment';

describe('OrderService', () => {
  let svc: OrderService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() applies date range + status params and unwraps data', () => {
    let total: number | undefined;
    svc.list({ page: 1, pageSize: 25, status: 'Delivered', fromDate: '2026-06-01', toDate: '2026-06-30' }).subscribe((r) => (total = r.totalCount));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/orders`);
    expect(req.request.params.get('status')).toBe('Delivered');
    expect(req.request.params.get('fromDate')).toBe('2026-06-01');
    req.flush({ success: true, data: { items: [], totalCount: 3, page: 1, pageSize: 25, totalPages: 1 } });
    expect(total).toBe(3);
  });

  it('create() POSTs the order body and returns the new id', () => {
    let id: string | undefined;
    svc.create({ customerId: 'c1', items: [{ productId: 'p1', quantity: 2 }] }).subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/orders`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.items[0].quantity).toBe(2);
    req.flush({ success: true, data: { id: 'order-1' } });
    expect(id).toBe('order-1');
  });
});
