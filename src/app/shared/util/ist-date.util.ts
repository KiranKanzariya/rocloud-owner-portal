import { environment } from '../../../environments/environment';

/**
 * "Today" helpers pinned to the app's configured display timezone (environment.timeZoneOffset,
 * default '+0530' = IST), so date-input defaults match what the app displays regardless of the
 * viewer's browser timezone. Using the browser's local date — e.g.
 * `new Date().toISOString().slice(0, 10)` (UTC) — shows *yesterday* for an IST user between 00:00
 * and 05:30 IST. We shift the current instant by the configured offset and read the UTC date parts,
 * which yields the target-timezone calendar date.
 *
 * Note: this is a fixed offset (no DST), matching Angular's DatePipe timezone capability. The app is
 * India-first (IST has no DST); a DST timezone would need a different mechanism on both ends.
 */
function offsetMs(): number {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(environment.timeZoneOffset ?? '+0000');
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3])) * 60 * 1000;
}

/** Current date in the configured timezone as `YYYY-MM-DD` (for <input type="date"> defaults). */
export function istToday(): string {
  return new Date(Date.now() + offsetMs()).toISOString().slice(0, 10);
}

/** Current month in the configured timezone as `YYYY-MM` (for <input type="month"> defaults). */
export function istMonth(): string {
  return istToday().slice(0, 7);
}

/** First day of the current month in the configured timezone as `YYYY-MM-DD`. */
export function istMonthStart(): string {
  return `${istMonth()}-01`;
}
