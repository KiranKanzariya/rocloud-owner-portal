import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationTemplateService } from './notification-template.service';
import { environment } from '../../../environments/environment';

describe('NotificationTemplateService', () => {
  let svc: NotificationTemplateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(NotificationTemplateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() unwraps the templates', () => {
    let count: number | undefined;
    svc.list().subscribe((t) => (count = t.length));
    const req = http.expectOne(`${environment.apiUrl}/notification-templates`);
    req.flush({ success: true, data: [{ id: 'n1', templateCode: 'welcome', channel: 'Email' }] });
    expect(count).toBe(1);
  });

  it('upsert() PUTs the template and returns the id', () => {
    let id: string | undefined;
    svc.upsert({ templateCode: 'welcome', languageCode: 'en', channel: 'Email', body: 'Hi {{name}}' })
      .subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/notification-templates`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.channel).toBe('Email');
    req.flush({ success: true, data: { id: 'n2' } });
    expect(id).toBe('n2');
  });
});
