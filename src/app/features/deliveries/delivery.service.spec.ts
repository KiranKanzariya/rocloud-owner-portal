import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeliveryService } from './delivery.service';
import { DeliveryBoard } from './delivery.models';
import { environment } from '../../../environments/environment';

describe('DeliveryService', () => {
  let svc: DeliveryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(DeliveryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('board() requests the date and unwraps the grouped data', () => {
    let board: DeliveryBoard | undefined;
    svc.board('2026-06-20').subscribe((b) => (board = b));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/deliveries/board`);
    expect(req.request.params.get('date')).toBe('2026-06-20');
    req.flush({ success: true, data: { pending: [{ id: 'd1' }], inTransit: [], delivered: [] } });
    expect(board?.pending.length).toBe(1);
  });

  it('updateStatus() PATCHes the status payload', () => {
    svc.updateStatus('d1', { status: 'Delivered', jarsDelivered: 2, collectedAmount: 80, paymentMethod: 'Cash' }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/deliveries/d1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBe('Delivered');
    expect(req.request.body.jarsDelivered).toBe(2);
    req.flush({ success: true, data: { id: 'd1' } });
  });

  it('uploadProof() posts multipart form data', () => {
    const file = new File(['x'], 'proof.jpg', { type: 'image/jpeg' });
    svc.uploadProof('d1', file).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/deliveries/d1/proof`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ success: true, data: { id: 'd1', proofImageUrl: 'tenant/delivery-proofs/x.jpg' } });
  });
});
