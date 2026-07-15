import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let svc: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('technicians() asks the API for the Technician role, rather than narrowing a page here', () => {
    // Narrowing client-side used to mean a workspace whose first 100 active users held no technician
    // got an empty dropdown. The role filter must reach the server.
    let techs: { name: string }[] | undefined;
    svc.technicians().subscribe((t) => (techs = t));

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/users`);
    expect(req.request.params.get('isActive')).toBe('true');
    expect(req.request.params.get('roleName')).toBe('Technician');

    req.flush({
      success: true,
      data: {
        items: [
          { id: 'u1', name: 'Ravi', roleName: 'Technician' },
          { id: 'u3', name: 'Amit', roleName: 'Technician' },
        ],
        totalCount: 2, page: 1, pageSize: 100, totalPages: 1,
      },
    });

    expect(techs?.length).toBe(2);
    expect(techs?.[0].name).toBe('Ravi');
  });

  it('technicians() degrades to [] on error (e.g. missing Users.View)', () => {
    let techs: unknown[] | undefined;
    svc.technicians().subscribe((t) => (techs = t));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/users`);
    req.flush({ success: false, error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(techs).toEqual([]);
  });
});
