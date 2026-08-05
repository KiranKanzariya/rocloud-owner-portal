import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { MoneyInComponent } from './money-in.component';
import { PermissionService } from '../../../core/services/permission.service';

/** Unsigned JWT — jwtDecode only reads the payload. */
function makeJwt(permissions: string): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ permissions, plan_type: 'Basic' })}.`;
}

const DUES = [
  { customerId: 'c1', customerName: 'Kamlesh Parshotam', customerMobile: '9978551402', invoiceCount: 1, outstandingAmount: 45, oldestDueDate: '2026-08-02', daysOverdue: 3 },
  { customerId: 'c2', customerName: 'Ramesh Patel', customerMobile: '9000000001', invoiceCount: 2, outstandingAmount: 300, oldestDueDate: '2026-07-20', daysOverdue: 16 },
];

describe('MoneyInComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoneyInComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(PermissionService).loadFromToken(makeJwt('Payments.View,Payments.Collect'));
  });

  afterEach(() => http.verify());

  /** Creating the component fires the load in its constructor. */
  function mount() {
    const fixture = TestBed.createComponent(MoneyInComponent);
    const req = http.expectOne((r) => r.url.endsWith('/payments/outstanding'));
    req.flush({ success: true, data: DUES });
    return { c: fixture.componentInstance as any, req };
  }

  it('asks for EVERYONE who owes, not the 7-day dunning default', () => {
    // A customer paying by QR today may owe on this morning's delivery — the aged default would hide
    // them, and the owner would have no row to tap.
    const { req } = mount();
    expect(req.request.params.get('overdueDays')).toBe('0');
  });

  it('totals only the rows currently visible', () => {
    const { c } = mount();
    expect(c.total()).toBe(345);

    c.search.set('ramesh');
    expect(c.visible().length).toBe(1);
    expect(c.total()).toBe(300);
  });

  it('searches by mobile as well as name', () => {
    const { c } = mount();
    c.search.set('9978');
    expect(c.visible().map((r: { customerId: string }) => r.customerId)).toEqual(['c1']);
  });

  it('records the full outstanding balance with the chosen method', async () => {
    const { c } = mount();

    const done = c.record(DUES[0]);
    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/payments'));
    expect(post.request.body).toEqual({ customerId: 'c1', amount: 45, paymentMethod: 'UPI' });
    post.flush({ success: true, data: { id: 'p1' } });
    await done;

    // Row is dropped rather than the list refetched: a list that reorders under the owner's finger is
    // how the wrong customer gets credited.
    expect(c.rows().map((r: { customerId: string }) => r.customerId)).toEqual(['c2']);
  });

  it('records as Cash when the method is switched', async () => {
    const { c } = mount();
    c.method.set('Cash');

    const done = c.record(DUES[1]);
    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/payments'));
    expect(post.request.body.paymentMethod).toBe('Cash');
    post.flush({ success: true, data: { id: 'p2' } });
    await done;
  });

  it('keeps the row when recording fails', async () => {
    const { c } = mount();

    const done = c.record(DUES[0]);
    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/payments'))
      .flush({ success: false, message: 'nope' }, { status: 500, statusText: 'Server Error' });
    await done;

    expect(c.rows().length).toBe(2);   // nothing lost — the owner can retry
    expect(c.busyId()).toBeNull();
  });
});
