import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { ToastService } from '../services/toast.service';
import { PermissionService } from '../services/permission.service';

/** Records what the user would actually have been shown. */
class ToastSpy {
  readonly errors: string[] = [];
  error(message: string): void {
    this.errors.push(message);
  }
  success(): void {}
}

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(permissions: string, roleName = 'Owner'): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ permissions, plan_type: 'Basic', role_name: roleName })}.`;
}

describe('errorInterceptor — 403 handling', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let toast: ToastSpy;
  let perms: PermissionService;
  let navigated: string[];
  let consoleError: typeof console.error;

  beforeEach(() => {
    navigated = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useClass: ToastSpy },
        { provide: AuthService, useValue: { refreshToken: () => undefined, clearSession: () => undefined } },
        { provide: TokenService, useValue: { getToken: () => null } },
        {
          provide: Router,
          useValue: { url: '/dashboard', navigate: (c: string[]) => (navigated.push(c.join('/')), Promise.resolve(true)) },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService) as unknown as ToastSpy;
    perms = TestBed.inject(PermissionService);
    perms.loadFromToken(makeJwt('BusinessProfile.View'));

    // The read path logs a defect on purpose; keep the test output clean.
    consoleError = console.error;
    console.error = () => undefined;
  });

  afterEach(() => {
    console.error = consoleError;
    ctrl.verify();
  });

  const reject403 = (body: object): void => {
    ctrl.expectOne('/api/thing').flush(body, { status: 403, statusText: 'Forbidden' });
  };

  it('toasts when a write is refused — the user clicked something', () => {
    http.post('/api/thing', {}).subscribe({ error: () => undefined });
    reject403({ code: 'PERMISSION_DENIED' });

    expect(toast.errors).toEqual(['You do not have permission to do that.']);
  });

  it('stays silent when a read is refused — the page asked, not the user', () => {
    http.get('/api/thing').subscribe({ error: () => undefined });
    reject403({ code: 'PERMISSION_DENIED' });

    expect(toast.errors).toEqual([]);
  });

  it('surfaces a plan upgrade on a read — RequirePlan gates GETs (e.g. Reports)', () => {
    http.get('/api/thing').subscribe({ error: () => undefined });
    reject403({ code: 'PLAN_UPGRADE_REQUIRED', error: 'Upgrade required', detail: 'This feature requires the Pro plan.' });

    expect(toast.errors).toEqual(['This feature requires the Pro plan.']);
  });

  it('still surfaces a plan limit, whatever the method', () => {
    http.get('/api/thing').subscribe({ error: () => undefined });
    reject403({ code: 'PLAN_LIMIT_REACHED', error: 'You have reached your plan limit.' });

    expect(toast.errors).toEqual(['You have reached your plan limit.']);
    expect(navigated).toEqual(['/settings/subscription']);
  });

  it('does not bounce a non-owner to the subscription page — only the Owner can pay', () => {
    perms.loadFromToken(makeJwt('Deliveries.ViewOwn,Payments.Collect', 'DeliveryBoy'));

    http.get('/api/thing').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/thing').flush({ code: 'PAYMENT_REQUIRED' }, { status: 402, statusText: 'Payment Required' });

    expect(toast.errors).toEqual(['Your subscription is overdue — please renew to continue.']);
    expect(navigated).toEqual([]);
  });
});
