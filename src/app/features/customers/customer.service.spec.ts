import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CustomerService } from './customer.service';
import { PagedResult } from '../../core/models/api-response';
import { CustomerListItem } from './customer.models';
import { environment } from '../../../environments/environment';

describe('CustomerService', () => {
  let svc: CustomerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(CustomerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() builds query params and unwraps ApiResponse.data', () => {
    let result: PagedResult<CustomerListItem> | undefined;
    svc
      .list({ page: 2, pageSize: 25, search: 'ravi', deliveryMode: 'HomeDelivery', isActive: true, sortBy: 'name', sortDir: 'asc' })
      .subscribe((r) => (result = r));

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/customers`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('search')).toBe('ravi');
    expect(req.request.params.get('deliveryMode')).toBe('HomeDelivery');
    expect(req.request.params.get('isActive')).toBe('true');

    req.flush({
      success: true,
      data: { items: [{ id: '1', name: 'Ravi' } as CustomerListItem], totalCount: 1, page: 2, pageSize: 25, totalPages: 1 },
    });

    expect(result?.items.length).toBe(1);
    expect(result?.totalCount).toBe(1);
  });

  it('create() POSTs to /customers and returns the new id', () => {
    let res: { id: string } | undefined;
    svc
      .create({ name: 'A', mobile: '9876543210', deliveryMode: 'HomeDelivery', paymentPreference: 'PerBottle' })
      .subscribe((r) => (res = r));

    const req = http.expectOne(`${environment.apiUrl}/customers`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { id: 'new-id' } });
    expect(res?.id).toBe('new-id');
  });

  it('delete() issues a DELETE to /customers/{id}', () => {
    svc.delete('abc').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/customers/abc`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: null });
  });
});
