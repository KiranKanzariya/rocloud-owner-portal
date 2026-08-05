import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { UpgradeModalComponent } from './upgrade-modal.component';
import { Plan } from '../../../../core/services/subscription.service';
import { PermissionService } from '../../../../core/services/permission.service';

/** Builds an unsigned JWT (jwtDecode only reads the payload — no signature needed for tests). */
function makeJwt(planType: string): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ permissions: '', plan_type: planType })}.`;
}

const plan = (planType: string, monthlyPrice: number): Plan => ({
  id: planType, name: planType, planType, monthlyPrice, yearlyPrice: monthlyPrice * 10,
  maxCustomers: 0, maxUsers: 0, maxDeliveryBoys: 0,
  whatsappEnabled: false, customRolesEnabled: false, multiBranchEnabled: false, apiAccessEnabled: false,
});

const STARTER = plan('Starter', 499);
const BASIC = plan('Basic', 999);
const PRO = plan('Pro', 2499);

/**
 * Downgrading is self-serve: it costs nothing now and lands at period end. These cover the UI rules
 * around that, since the API side is already proven by PlanChangeCompletionTests.
 */
describe('UpgradeModalComponent — downgrades', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpgradeModalComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService(),
      ],
    }).compileComponents();
  });

  /** The modal never opens here — only its decision logic is under test. */
  function mount(planType: string, scheduledPlanType: string | null = null) {
    TestBed.inject(PermissionService).loadFromToken(makeJwt(planType));
    const fixture = TestBed.createComponent(UpgradeModalComponent);
    fixture.componentRef.setInput('plans', [STARTER, BASIC, PRO]);
    fixture.componentRef.setInput('lockCurrentPlan', true);
    fixture.componentRef.setInput('scheduledPlanType', scheduledPlanType);
    return fixture.componentInstance;
  }

  it('ranks a cheaper tier as a downgrade, including the new Starter floor', () => {
    const c = mount('Basic');
    expect(c.isDowngrade(STARTER)).toBe(true);
    expect(c.isDowngrade(PRO)).toBe(false);
  });

  it('offers a downgrade rather than blocking it', () => {
    const c = mount('Pro');
    // Was disabled with "Contact us to downgrade"; the only self-serve escape was cancelling.
    expect(c.isLockedCurrent(STARTER)).toBe(false);
    expect(c.ctaKey(STARTER)).toBe('Switch to {{name}}');
    expect(c.ctaKey(PRO)).toBe('Choose {{name}}');
  });

  it('locks the current plan while nothing is scheduled', () => {
    const c = mount('Basic');
    expect(c.isLockedCurrent(BASIC)).toBe(true);
  });

  it('unlocks the current plan once a downgrade is parked, so it can be cancelled', () => {
    // The subscription page tells owners to "choose your current plan again to cancel" — that
    // instruction was unfollowable while the current card stayed disabled.
    const c = mount('Pro', 'Starter');
    expect(c.isLockedCurrent(PRO)).toBe(false);
    expect(c.isCancellingDowngrade(PRO)).toBe(true);
    expect(c.ctaKey(PRO)).toBe('Keep {{name}}');
  });

  it('flags only the plan a parked downgrade will land on', () => {
    const c = mount('Pro', 'Starter');
    expect(c.isScheduled(STARTER)).toBe(true);
    expect(c.isScheduled(BASIC)).toBe(false);
    expect(c.isScheduled(PRO)).toBe(false);
  });

  it('falls back to a generic date when the period end is unknown', () => {
    const c = mount('Pro');
    expect(c.effectiveOn()).toBe('your renewal date');
  });
});
