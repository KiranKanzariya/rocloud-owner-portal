import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

/**
 * Requires route.data.permission (when set) and/or route.data.ownerOnly (Owner role only).
 * Redirects to /forbidden when the check fails.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const perms = inject(PermissionService);
  const router = inject(Router);

  if (route.data['ownerOnly'] && !perms.isOwner()) {
    return router.createUrlTree(['/forbidden']);
  }

  const required = route.data['permission'] as string | undefined;
  if (!required || perms.can(required)) return true;

  return router.createUrlTree(['/forbidden']);
};
