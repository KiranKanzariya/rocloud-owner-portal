import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { ToastService } from '../services/toast.service';

/**
 * Centralised HTTP error handling (guide §18):
 *  - 401 on an API call → try a single token refresh and retry; if that fails, log out + /login.
 *  - 402 PAYMENT_REQUIRED (overdue past grace) and 401 TENANT_SUSPENDED → send the owner to the
 *    subscription page, which stays reachable so they can pay to restore access (guide §25).
 *  - 401 TENANT_CANCELLED → log out.
 *  - 403 → toast.
 * Requests to /auth/* are exempt from the refresh dance (login/refresh handle their own 401s).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = inject(TokenService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const isAuthEndpoint = req.url.includes('/auth/');
  const code = (err: HttpErrorResponse): string | undefined => err.error?.code;
  const goToSubscription = (): void => {
    if (!router.url.startsWith('/settings/subscription')) void router.navigate(['/settings/subscription']);
  };

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Plan-limit rejection (e.g. user cap) — show the real "upgrade required" message and point
      // the owner at the subscription page, instead of a misleading "no permission" toast.
      if (err.status === 403 && code(err) === 'PLAN_LIMIT_REACHED') {
        toast.error(err.error?.error ?? 'You have reached your plan limit — upgrade to continue.');
        goToSubscription();
        return throwError(() => err);
      }
      if (err.status === 403) toast.error('You do not have permission to do that.');

      // Overdue past grace — renewal page is still reachable; guide the owner there to pay.
      if (err.status === 402) {
        toast.error('Your subscription is overdue — please renew to continue.');
        goToSubscription();
        return throwError(() => err);
      }

      // Suspended for non-payment: can still self-pay to reactivate → route to the subscription page.
      if (err.status === 401 && code(err) === 'TENANT_SUSPENDED') {
        toast.error('Your account is suspended for non-payment — renew to reactivate.');
        goToSubscription();
        return throwError(() => err);
      }

      // Cancelled & period ended: can re-subscribe to reclaim the workspace → route to subscribe.
      if (err.status === 401 && code(err) === 'TENANT_CANCELLED') {
        toast.error('Your subscription has ended — subscribe to reactivate your workspace.');
        goToSubscription();
        return throwError(() => err);
      }

      if (err.status === 401 && !isAuthEndpoint) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const fresh = token.getToken();
            const retried = req.clone({
              withCredentials: true,
              setHeaders: fresh ? { Authorization: `Bearer ${fresh}` } : {},
            });
            return next(retried);
          }),
          catchError(() => {
            auth.clearSession();
            void router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
      }

      return throwError(() => err);
    }),
  );
};
