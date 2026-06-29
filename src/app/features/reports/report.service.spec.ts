import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportService } from './report.service';
import { environment } from '../../../environments/environment';

describe('ReportService', () => {
  let svc: ReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('collection() sends the date range and unwraps the array', () => {
    let len: number | undefined;
    svc.collection({ from: '2026-06-01', to: '2026-06-30' }).subscribe((d) => (len = d.length));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/reports/collection`);
    expect(req.request.params.get('from')).toBe('2026-06-01');
    expect(req.request.params.get('to')).toBe('2026-06-30');
    req.flush({ success: true, data: [{ date: '2026-06-01', totalCollected: 500 }] });
    expect(len).toBe(1);
  });

  it('bottleTracking() hits the bottle-tracking endpoint', () => {
    svc.bottleTracking().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/reports/bottle-tracking`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('exportUrl() builds the export URL with format + range', () => {
    expect(svc.exportUrl('area-performance', 'xlsx', { from: '2026-06-01', to: '2026-06-30' })).toBe(
      `${environment.apiUrl}/reports/area-performance/export?format=xlsx&from=2026-06-01&to=2026-06-30`,
    );
  });
});
