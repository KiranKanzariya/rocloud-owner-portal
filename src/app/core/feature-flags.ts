/**
 * Compile-time switches for deferring whole modules that aren't part of the current release.
 *
 * Unlike plan gating (an upgrade path) or permissions (per-role access), a feature flag hides a
 * module from EVERYONE regardless of plan or role — used when the feature simply isn't shipping yet.
 * The code stays in the repo; flip the flag to bring it back.
 *
 * Checked by: the sidebar (NavItem.feature), the command palette, the route featureGuard, and any
 * component that surfaces the feature (e.g. the customer-detail Service tab).
 */
export const FEATURES = {
  /** AMC / Service module — deferred to a future release; not part of v1. */
  amcService: false,
} as const;

export type FeatureName = keyof typeof FEATURES;

/** True when the named feature is switched on for this build. */
export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}
