import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ServiceRequestService } from './service-request.service';
import { environment } from '../../../environments/environment';

describe('ServiceRequestService', () => {
  let svc: ServiceRequestService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(ServiceRequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() applies the status filter and unwraps the page', () => {
    let count: number | undefined;
    svc.list({ page: 1, pageSize: 25, status: 'Open' }).subscribe((r) => (count = r.items.length));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/service-requests`);
    expect(req.request.params.get('status')).toBe('Open');
    req.flush({ success: true, data: { items: [{ id: 's1' }], totalCount: 1, page: 1, pageSize: 25, totalPages: 1 } });
    expect(count).toBe(1);
  });

  it('create() POSTs and returns the id', () => {
    let id: string | undefined;
    svc.create({ customerId: 'c1', title: 'Filter change', serviceType: 'FilterChange' }).subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/service-requests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.title).toBe('Filter change');
    req.flush({ success: true, data: { id: 'sr-1' } });
    expect(id).toBe('sr-1');
  });

  it('assign() PUTs the technician id', () => {
    svc.assign('sr-1', 'tech-1').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/service-requests/sr-1/assign`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.technicianId).toBe('tech-1');
    req.flush({ success: true, data: { id: 'sr-1' } });
  });

  it('updateStatus() PATCHes status + resolution notes', () => {
    svc.updateStatus('sr-1', 'Resolved', 'Replaced filter').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/service-requests/sr-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBe('Resolved');
    expect(req.request.body.resolutionNotes).toBe('Replaced filter');
    req.flush({ success: true, data: { id: 'sr-1' } });
  });
});
