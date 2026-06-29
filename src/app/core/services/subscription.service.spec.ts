import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';
import { environment } from '../../../environments/environment';

describe('SubscriptionService', () => {
  let svc: SubscriptionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(SubscriptionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('plans() unwraps the plan list', () => {
    let count: number | undefined;
    svc.plans().subscribe((p) => (count = p.length));
    const req = http.expectOne(`${environment.apiUrl}/plans`);
    req.flush({ success: true, data: [{ planType: 'Basic' }, { planType: 'Pro' }, { planType: 'Enterprise' }] });
    expect(count).toBe(3);
  });

  it('current() unwraps the subscription + usage', () => {
    let plan: string | undefined;
    svc.current().subscribe((s) => (plan = s.planType));
    const req = http.expectOne(`${environment.apiUrl}/subscription`);
    req.flush({ success: true, data: { planType: 'Pro', usage: { customers: 5, maxCustomers: 1000 } } });
    expect(plan).toBe('Pro');
  });

  it('initiate() POSTs planType + billingCycle', () => {
    let dev: boolean | undefined;
    svc.initiate('Pro', 'Monthly').subscribe((r) => (dev = r.devMode));
    const req = http.expectOne(`${environment.apiUrl}/subscription/initiate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ planType: 'Pro', billingCycle: 'Monthly' });
    req.flush({ success: true, data: { keyId: 'rzp_test_xxx', subscriptionId: null, devMode: true } });
    expect(dev).toBe(true);
  });

  it('completeUpgrade() POSTs to upgrade-complete', () => {
    svc.completeUpgrade('Enterprise', 'Yearly').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/subscription/upgrade-complete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.planType).toBe('Enterprise');
    req.flush({ success: true, data: { upgraded: true } });
  });

  it('cancel() POSTs to cancel', () => {
    svc.cancel().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/subscription/cancel`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { cancelled: true } });
  });
});
