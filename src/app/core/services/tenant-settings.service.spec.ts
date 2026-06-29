import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantSettingsService } from './tenant-settings.service';
import { environment } from '../../../environments/environment';

describe('TenantSettingsService', () => {
  let svc: TenantSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(TenantSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('get() unwraps the settings', () => {
    let name: string | undefined;
    svc.get().subscribe((s) => (name = s.name));
    const req = http.expectOne(`${environment.apiUrl}/settings`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { id: 't1', name: 'AquaPure', defaultLanguage: 'en' } });
    expect(name).toBe('AquaPure');
  });

  it('update() PUTs the profile', () => {
    svc.update({ name: 'AquaPure 2', defaultLanguage: 'hi' }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/settings`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.defaultLanguage).toBe('hi');
    req.flush({ success: true, data: { updated: true } });
  });
});
