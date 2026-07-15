import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureName, isFeatureEnabled } from '../feature-flags';

/**
 * Blocks a route whose feature flag is off (route.data.feature), so a deferred module can't be
 * reached by typing its URL. Sends the user to the dashboard rather than /forbidden — the page isn't
 * denied to them, it simply doesn't exist in this release.
 */
export const featureGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const feature = route.data['feature'] as FeatureName | undefined;
  if (!feature || isFeatureEnabled(feature)) return true;
  return router.createUrlTree(['/dashboard']);
};
