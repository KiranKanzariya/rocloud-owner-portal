import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantSettingsService } from './tenant-settings.service';
import { PermissionService } from './permission.service';
import { environment } from '../../../environments/environment';

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(permissions: string): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ permissions, plan_type: 'Basic' })}.`;
}

describe('TenantSettingsService', () => {
  let svc: TenantSettingsService;
  let http: HttpTestingController;
  let perms: PermissionService;
  let consoleWarn: typeof console.warn;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(TenantSettingsService);
    http = TestBed.inject(HttpTestingController);
    perms = TestBed.inject(PermissionService);
    perms.loadFromToken(makeJwt('BusinessProfile.View'));

    consoleWarn = console.warn;
    console.warn = () => undefined;
  });

  afterEach(() => {
    console.warn = consoleWarn;
    http.verify();
  });

  it('get() unwraps the settings', () => {
    let name: string | undefined;
    svc.get().subscribe((s) => (name = s.name));
    const req = http.expectOne(`${environment.apiUrl}/settings`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { id: 't1', name: 'AquaPure', defaultLanguage: 'en' } });
    expect(name).toBe('AquaPure');
  });

  it('update() PUTs the profile', () => {
    svc.update({ name: 'AquaPure 2', defaultLanguage: 'hi', gstEnabled: false, gstPercent: 0 }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/settings`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.defaultLanguage).toBe('hi');
    req.flush({ success: true, data: { updated: true } });
  });

  it('billing() reads the narrow GST endpoint, not the full profile', () => {
    let gst: number | undefined;
    svc.billing().subscribe((b) => (gst = b?.gstPercent));

    const req = http.expectOne(`${environment.apiUrl}/settings/billing`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { gstEnabled: true, gstPercent: 18, gstNumber: '24ABCDE1234F1Z5' } });

    expect(gst).toBe(18);
  });

  it('billing() works for an Accountant — Invoices.View without BusinessProfile.View', () => {
    perms.loadFromToken(makeJwt('Invoices.View,Invoices.Create'));

    svc.billing().subscribe();
    http.expectOne(`${environment.apiUrl}/settings/billing`).flush({ success: true, data: { gstEnabled: false } });
  });

  it('billing() sends no request when the role may read neither', () => {
    perms.loadFromToken(makeJwt('Deliveries.ViewOwn'));

    let result: unknown = 'untouched';
    svc.billing().subscribe((b) => (result = b));

    http.expectNone(`${environment.apiUrl}/settings/billing`);
    expect(result).toBeNull();
  });
});
