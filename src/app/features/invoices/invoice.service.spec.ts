import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvoiceService } from './invoice.service';
import { environment } from '../../../environments/environment';

describe('InvoiceService', () => {
  let svc: InvoiceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(InvoiceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('generate() POSTs the customer + period and returns the id', () => {
    let id: string | undefined;
    svc.generate({ customerId: 'c1', periodFrom: '2026-06-01', periodTo: '2026-06-30' }).subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/invoices/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.periodFrom).toBe('2026-06-01');
    req.flush({ success: true, data: { id: 'inv-1' } });
    expect(id).toBe('inv-1');
  });

  it('send() POSTs to /invoices/{id}/send', () => {
    svc.send('inv-1').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/invoices/inv-1/send`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { id: 'inv-1' } });
  });

  it('pdfUrl() builds the PDF endpoint', () => {
    expect(svc.pdfUrl('inv-1')).toBe(`${environment.apiUrl}/invoices/inv-1/pdf`);
  });
});
