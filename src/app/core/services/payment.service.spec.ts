import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { environment } from '../../../environments/environment';

describe('PaymentService', () => {
  let svc: PaymentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(PaymentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() applies method + date filters and unwraps the page', () => {
    let total: number | undefined;
    svc.list({ page: 1, pageSize: 25, paymentMethod: 'Cash', fromDate: '2026-06-01' }).subscribe((r) => (total = r.totalCount));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/payments`);
    expect(req.request.params.get('paymentMethod')).toBe('Cash');
    expect(req.request.params.get('fromDate')).toBe('2026-06-01');
    req.flush({ success: true, data: { items: [], totalCount: 3, page: 1, pageSize: 25, totalPages: 1 } });
    expect(total).toBe(3);
  });

  it('outstanding() sends overdueDays and unwraps the list', () => {
    let len: number | undefined;
    svc.outstanding(14).subscribe((d) => (len = d.length));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/payments/outstanding`);
    expect(req.request.params.get('overdueDays')).toBe('14');
    req.flush({ success: true, data: [{ customerId: 'c1', outstandingAmount: 200 }] });
    expect(len).toBe(1);
  });

  it('collect() POSTs the payment and returns the id', () => {
    let id: string | undefined;
    svc.collect({ customerId: 'c1', amount: 100, paymentMethod: 'UPI' }).subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.amount).toBe(100);
    req.flush({ success: true, data: { id: 'pay-1' } });
    expect(id).toBe('pay-1');
  });
});
