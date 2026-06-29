import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

/** Blocks routes for unauthenticated users, sending them to /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const token = inject(TokenService);
  const router = inject(Router);

  if (token.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
