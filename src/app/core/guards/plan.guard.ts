import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService, PlanType } from '../services/permission.service';

/** Requires route.data.plan (Basic < Pro < Enterprise); redirects to /upgrade when below it. */
export const planGuard: CanActivateFn = (route) => {
  const perms = inject(PermissionService);
  const router = inject(Router);

  const required = route.data['plan'] as PlanType | undefined;
  if (!required || perms.hasPlan(required)) return true;

  return router.createUrlTree(['/upgrade']);
};
