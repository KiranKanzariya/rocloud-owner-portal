import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AreaService } from './area.service';
import { environment } from '../../../environments/environment';

describe('AreaService', () => {
  let svc: AreaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(AreaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() sends includeInactive and unwraps the array', () => {
    let count: number | undefined;
    svc.list(true).subscribe((a) => (count = a.length));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/areas`);
    expect(req.request.params.get('includeInactive')).toBe('true');
    req.flush({ success: true, data: [{ id: 'a1', name: 'Satellite' }] });
    expect(count).toBe(1);
  });

  it('create() POSTs the area and returns the id', () => {
    let id: string | undefined;
    svc.create({ name: 'Bopal' }).subscribe((r) => (id = r.id));
    const req = http.expectOne(`${environment.apiUrl}/areas`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { id: 'a2' } });
    expect(id).toBe('a2');
  });

  it('delete() DELETEs the area', () => {
    svc.delete('a2').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/areas/a2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { id: 'a2' } });
  });
});
