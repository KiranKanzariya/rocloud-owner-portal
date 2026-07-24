import { expiryState, SubscriptionInfo } from './subscription-status';

const NOW = new Date('2026-07-12T09:00:00Z');

/** A tenant on a free trial ending at the given time, with nothing bought. */
const onTrial = (trialEndsAt: string, status = 'Trial'): SubscriptionInfo => ({
  status,
  trialEndsAt,
  subscriptionEndsAt: null,
});

/** A paying tenant. The stale trial date is deliberate — every tenant keeps one forever. */
const paying = (subscriptionEndsAt: string, status = 'Active', netMonthlyPrice = 999): SubscriptionInfo => ({
  status,
  trialEndsAt: '2025-01-01T00:00:00Z',
  subscriptionEndsAt,
  netMonthlyPrice,
});

describe('expiryState — trials', () => {
  it('counts whole calendar days, not 24-hour blocks', () => {
    const s = expiryState(onTrial('2026-07-14T09:00:00Z'), NOW);

    expect(s.kind).toBe('trial');
    expect(s.daysLeft).toBe(2);
    expect(s.endingSoon).toBe(true);
    expect(s.expired).toBe(false);
  });

  it("counts days in the VIEWER's timezone, not UTC", () => {
    // 23:00 UTC on the 14th is already the 15th in IST, so an Indian owner is told 3 days, not 2 —
    // matching the date they would see printed anywhere else in the app. Only meaningful east of UTC,
    // so assert the relationship rather than a fixed number, keeping this green on a UTC CI box.
    const lateUtc = expiryState(onTrial('2026-07-14T23:00:00Z'), NOW).daysLeft!;
    const sameDayLocal = expiryState(onTrial('2026-07-14T09:00:00Z'), NOW).daysLeft!;

    expect(lateUtc).toBeGreaterThanOrEqual(sameDayLocal);
    expect(lateUtc - sameDayLocal).toBeLessThanOrEqual(1);
  });

  it('says 0 days on the final morning — it has not lapsed yet', () => {
    const s = expiryState(onTrial('2026-07-12T18:00:00Z'), NOW);

    expect(s.daysLeft).toBe(0);
    expect(s.expired).toBe(false);
    expect(s.endingSoon).toBe(true);
  });

  it('flips to expired the moment the end time passes, before the status changes', () => {
    // The nightly job has not run yet, so the tenant is still labelled Trial.
    const s = expiryState(onTrial('2026-07-12T08:00:00Z', 'Trial'), NOW);

    expect(s.expired).toBe(true);
    expect(s.endingSoon).toBe(false); // never both at once
  });

  it('stays quiet earlier than the warning window', () => {
    const s = expiryState(onTrial('2026-07-25T09:00:00Z'), NOW);

    expect(s.daysLeft).toBe(13);
    expect(s.endingSoon).toBe(false);
  });
});

describe('expiryState — paid subscriptions', () => {
  it('warns about the renewal inside the final week', () => {
    const s = expiryState(paying('2026-07-15T09:00:00Z'), NOW);

    expect(s.kind).toBe('paid');
    expect(s.daysLeft).toBe(3);
    expect(s.endingSoon).toBe(true);
  });

  it('never mistakes a paying tenant for a trial, however old its trial date is', () => {
    // The trap: trialEndsAt was 18 months ago, but they have been paying ever since.
    const s = expiryState(paying('2026-08-01T00:00:00Z'), NOW);

    expect(s.kind).toBe('paid');
    expect(s.endingSoon).toBe(false); // 20 days out — nothing to say yet
    expect(s.expired).toBe(false);
  });

  it('reports a lapsed paid subscription as expired, not as a dead trial', () => {
    const s = expiryState(paying('2026-07-01T00:00:00Z', 'Overdue'), NOW);

    expect(s.kind).toBe('paid');
    expect(s.expired).toBe(true);
  });

  it('stays quiet for a free / fully-discounted plan — the job auto-renews it', () => {
    const comped = expiryState(paying('2026-07-14T09:00:00Z', 'Active', 0), NOW);

    expect(comped).toEqual({ kind: null, daysLeft: null, expired: false, endingSoon: false });
  });
});

describe('expiryState — nothing to say', () => {
  it('defers to the cancellation message when the tenant cancelled', () => {
    expect(expiryState(onTrial('2026-07-14T09:00:00Z', 'Cancelled'), NOW).kind).toBeNull();
    expect(expiryState(paying('2026-07-14T09:00:00Z', 'Cancelled'), NOW).kind).toBeNull();
  });

  it('reports nothing when there is no subscription or no dates at all', () => {
    expect(expiryState(null, NOW).kind).toBeNull();
    expect(expiryState({ status: 'Active', trialEndsAt: null, subscriptionEndsAt: null }, NOW).kind).toBeNull();
  });

  it('ignores an unparseable date rather than rendering NaN days', () => {
    expect(expiryState(onTrial('not-a-date'), NOW).kind).toBeNull();
  });
});
