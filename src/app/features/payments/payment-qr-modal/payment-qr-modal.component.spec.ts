import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { PaymentQrModalComponent } from './payment-qr-modal.component';

/**
 * The counter QR must show the CURRENT balance, and must fail visibly rather than silently: a blank
 * modal in front of a waiting customer is worse than a message telling the owner what to do.
 */
describe('PaymentQrModalComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentQrModalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function open(customerId: string | null) {
    const fixture = TestBed.createComponent(PaymentQrModalComponent);
    fixture.componentRef.setInput('customerId', customerId);
    fixture.detectChanges();   // runs the effect
    return fixture;
  }

  it('fetches nothing until a customer is selected', () => {
    open(null);
    http.expectNone(() => true);
  });

  it('asks the server for the payload rather than building it in the browser', async () => {
    const fixture = open('c1');
    const req = http.expectOne((r) => r.url.endsWith('/payments/customers/c1/upi-qr'));
    expect(req.request.method).toBe('GET');

    req.flush({
      success: true,
      data: { customerId: 'c1', customerName: 'Kamlesh', balance: 45, payload: 'upi://pay?pa=x@y&am=45.00', vpa: 'x@y', configured: true },
    });
    await fixture.whenStable();

    const c = fixture.componentInstance as any;
    expect(c.data().balance).toBe(45);
    expect(c.failed()).toBe(false);
  });

  it('distinguishes "not set up" from "owes nothing"', async () => {
    // Both have a null payload, but one is fixed in settings and the other is simply good news —
    // collapsing them would send owners hunting through settings for a non-problem.
    const notSetUp = open('c2');
    http.expectOne((r) => r.url.endsWith('/payments/customers/c2/upi-qr')).flush({
      success: true,
      data: { customerId: 'c2', customerName: 'A', balance: 45, payload: null, vpa: null, configured: false },
    });
    await notSetUp.whenStable();
    expect((notSetUp.componentInstance as any).data().configured).toBe(false);

    const nothingOwed = open('c3');
    http.expectOne((r) => r.url.endsWith('/payments/customers/c3/upi-qr')).flush({
      success: true,
      data: { customerId: 'c3', customerName: 'B', balance: 0, payload: null, vpa: null, configured: true },
    });
    await nothingOwed.whenStable();
    const c = nothingOwed.componentInstance as any;
    expect(c.data().configured).toBe(true);
    expect(c.data().balance).toBe(0);
  });

  it('can reach toDataURL on the CommonJS qrcode module', async () => {
    // `qrcode` ships CommonJS, so under `await import()` its API may sit on `.default` or directly
    // on the namespace depending on the bundler. Reading the wrong one returns undefined and the QR
    // silently fails to draw — which is exactly what happened. This pins the resolution the
    // component uses, so a package or bundler change breaks the build instead of the counter.
    const mod = (await import('qrcode')) as unknown as Record<string, unknown>;
    const api = (mod['default'] ?? mod) as { toDataURL?: unknown };

    expect(typeof api.toDataURL).toBe('function');
  });

  it('surfaces a failure instead of showing an empty modal', async () => {
    const fixture = open('c4');
    http.expectOne((r) => r.url.endsWith('/payments/customers/c4/upi-qr'))
      .flush({ success: false }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const c = fixture.componentInstance as any;
    expect(c.failed()).toBe(true);
    expect(c.loading()).toBe(false);
  });
});
