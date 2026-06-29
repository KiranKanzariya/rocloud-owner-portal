import { PermissionService } from './permission.service';

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.`;
}

describe('PermissionService', () => {
  let svc: PermissionService;

  beforeEach(() => {
    svc = new PermissionService();
  });

  it('loads permissions and plan from the token', () => {
    svc.loadFromToken(
      makeJwt({
        sub: 'u1',
        name: 'Rajesh',
        tenant_id: 't1',
        plan_type: 'Pro',
        permissions: 'Customers.View,Customers.Create,Orders.View',
      }),
    );

    expect(svc.can('Customers.Create')).toBe(true);
    expect(svc.can('Customers.Delete')).toBe(false);
    expect(svc.name()).toBe('Rajesh');
    expect(svc.plan()).toBe('Pro');
  });

  it('canAny matches when at least one permission is present', () => {
    svc.loadFromToken(makeJwt({ permissions: 'Orders.View', plan_type: 'Basic' }));
    expect(svc.canAny('Orders.Edit', 'Orders.View')).toBe(true);
    expect(svc.canAny('Orders.Edit', 'Orders.Create')).toBe(false);
  });

  it('hasPlan respects the Basic < Pro < Enterprise order', () => {
    svc.loadFromToken(makeJwt({ permissions: '', plan_type: 'Pro' }));
    expect(svc.hasPlan('Basic')).toBe(true);
    expect(svc.hasPlan('Pro')).toBe(true);
    expect(svc.hasPlan('Enterprise')).toBe(false);
  });

  it('clear resets to empty Basic state', () => {
    svc.loadFromToken(makeJwt({ permissions: 'Customers.View', plan_type: 'Enterprise' }));
    svc.clear();
    expect(svc.can('Customers.View')).toBe(false);
    expect(svc.plan()).toBe('Basic');
    expect(svc.name()).toBe('');
  });
});
