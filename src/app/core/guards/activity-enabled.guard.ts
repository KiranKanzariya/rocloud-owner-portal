import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { ActivityAvailabilityService } from '../services/activity-availability.service';

/** Blocks the Activity log page when the SuperAdmin has disabled the activity log. */
export const activityEnabledGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(ActivityAvailabilityService)
    .load()
    .pipe(map((enabled) => (enabled ? true : router.parseUrl('/dashboard'))));
};
