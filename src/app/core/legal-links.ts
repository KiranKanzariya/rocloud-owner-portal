import { environment } from '../../environments/environment';

/**
 * The public policy pages, served from the marketing site (rocloud.app) — not from this portal.
 *
 * They live in exactly one place so the published text can never drift into two versions, and so
 * the URLs stay stable: these are the addresses registered with Razorpay. Always link out to them;
 * never restate a policy inside the app.
 *
 * Source of truth for the text: docs/legal/*.md → built by rocloud-site.
 */
export const LEGAL = {
  terms: `${environment.siteUrl}/legal/terms`,
  privacy: `${environment.siteUrl}/legal/privacy`,
  refunds: `${environment.siteUrl}/legal/refunds`,
  cancellation: `${environment.siteUrl}/legal/cancellation`,
  delivery: `${environment.siteUrl}/legal/delivery`,
  contact: `${environment.siteUrl}/legal/contact`,
} as const;
