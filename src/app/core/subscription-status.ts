/**
 * Shared expiry-countdown maths for BOTH lifecycle ends — a free trial running out and a paid
 * subscription coming up for renewal. Used by the subscription page's banners and the shell-wide strip.
 *
 * Kept as one pure function so the awkward cases are pinned by tests rather than re-derived at each call
 * site. The two that bite:
 *   • A paying tenant keeps its `trialEndsAt` forever, so `subscriptionEndsAt` must win — otherwise a
 *     customer two years in gets told their trial is expiring.
 *   • A free / fully-discounted plan AUTO-renews in SubscriptionExpiryJob, so its end date sliding
 *     closer is routine, not a problem worth warning about.
 */

/** The subscription fields this calculation needs (a structural subset of Subscription). */
export interface SubscriptionInfo {
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  /** Price after any platform discount. 0 (or absent) means the plan auto-renews and never lapses. */
  netMonthlyPrice?: number;
}

/** Which end date is running out — they need different wording and a different call to action. */
export type ExpiryKind = 'trial' | 'paid';

export interface ExpiryState {
  /** Null when there is nothing to warn about (paid-up, cancelled, free plan, no dates). */
  kind: ExpiryKind | null;
  /** Whole calendar days until it ends; 0 = today, negative once past. Null when kind is null. */
  daysLeft: number | null;
  /** The end moment has passed and it has not been renewed. */
  expired: boolean;
  /** Still running, inside the final week. */
  endingSoon: boolean;
}

/** Matches Jobs:SubscriptionExpiryWarnDays, so the in-app warning starts with the reminder emails. */
export const EXPIRY_WARN_DAYS = 7;

const NOTHING: ExpiryState = { kind: null, daysLeft: null, expired: false, endingSoon: false };

/** Midnight-to-midnight in the VIEWER's timezone, so "ends tomorrow" matches the date they see. */
function midnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function expiryState(
  sub: SubscriptionInfo | null | undefined,
  now: Date = new Date(),
): ExpiryState {
  // Cancelled is excluded so a tenant who cancels gets only the cancellation message — its wording is
  // the more specific of the two, and both banners would otherwise render together.
  if (!sub || sub.status === 'Cancelled') return NOTHING;

  // A paid end date always wins: it proves they bought something, whatever the stale trial date says.
  const kind: ExpiryKind | null = sub.subscriptionEndsAt ? 'paid' : sub.trialEndsAt ? 'trial' : null;
  if (kind === null) return NOTHING;

  // A ₹0 plan is auto-renewed by the nightly job before it can lapse — warning about it is noise.
  if (kind === 'paid' && (sub.netMonthlyPrice ?? 0) <= 0) return NOTHING;

  const endsAt = new Date((kind === 'paid' ? sub.subscriptionEndsAt : sub.trialEndsAt)!);
  if (Number.isNaN(endsAt.getTime())) return NOTHING;

  const daysLeft = Math.round((midnight(endsAt) - midnight(now)) / 86_400_000);
  // Expiry is judged on the exact moment, not the calendar day or the status: the nightly job only
  // flips Trial/Active → Overdue the next morning, and during that gap it has lapsed but the status
  // still says otherwise. Keying off the status would leave the owner unwarned for up to a day.
  const expired = endsAt.getTime() <= now.getTime();

  return { kind, daysLeft, expired, endingSoon: !expired && daysLeft <= EXPIRY_WARN_DAYS };
}
