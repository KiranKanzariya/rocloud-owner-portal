import { TokenService } from './token.service';

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.`;
}

describe('TokenService', () => {
  let svc: TokenService;

  beforeEach(() => {
    svc = new TokenService();
  });

  it('stores and returns the token', () => {
    expect(svc.getToken()).toBeNull();
    svc.set('abc');
    expect(svc.getToken()).toBe('abc');
    svc.clear();
    expect(svc.getToken()).toBeNull();
  });

  it('isAuthenticated is true for a non-expired token', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    svc.set(makeJwt({ sub: 'u1', exp: future }));
    expect(svc.isAuthenticated()).toBe(true);
    expect(svc.isExpired()).toBe(false);
  });

  it('treats an expired token as not authenticated', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    svc.set(makeJwt({ sub: 'u1', exp: past }));
    expect(svc.isExpired()).toBe(true);
    expect(svc.isAuthenticated()).toBe(false);
  });
});
