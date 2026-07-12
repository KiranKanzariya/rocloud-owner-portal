import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { ToastService } from '../services/toast.service';
import { PermissionService } from '../services/permission.service';

/**
 * Centralised HTTP error handling (guide §18):
 *  - 401 on an API call → try a single token refresh and retry; if that fails, log out + /login.
 *  - 402 PAYMENT_REQUIRED (overdue past grace) and 401 TENANT_SUSPENDED → send the owner to the
 *    subscription page, which stays reachable so they can pay to restore access (guide §25).
 *  - 401 TENANT_CANCELLED → log out.
 *  - 403 on a write → toast; on a read → developer log (see below).
 * Requests to /auth/* are exempt from the refresh dance (login/refresh handle their own 401s).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = inject(TokenService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const perms = inject(PermissionService);

  const isAuthEndpoint = req.url.includes('/auth/');
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
  const code = (err: HttpErrorResponse): string | undefined => err.error?.code;

  // The subscription page is Owner-only. Sending anyone else there (a delivery boy on an overdue
  // tenant) would land them on /forbidden, which explains nothing — leave them where they are with
  // the toast, which already says what is wrong. They cannot pay in any case.
  const goToSubscription = (): void => {
    if (!perms.isOwner()) return;
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
      // Plan gating (RequirePlan) sits on reads too — ReportsController gates every GET on Pro — so
      // it must be answered before the read/write split below, or a Basic tenant's Reports page
      // would fail in silence. Show the real "requires the X plan" message, not "no permission".
      if (err.status === 403 && code(err) === 'PLAN_UPGRADE_REQUIRED') {
        toast.error(err.error?.detail ?? err.error?.error ?? 'This feature requires a higher plan.');
        return throwError(() => err);
      }

      // A 403 on a write is the user's own action being refused — they need to be told why nothing
      // happened. A 403 on a read cannot happen through legitimate use (services check the JWT's
      // permissions before calling, and no GET is gated behind a write permission), so it means a
      // page asked for something it had no right to. That is a defect for us, not a scolding for
      // the user: surface it in the console instead of a toast.
      if (err.status === 403) {
        if (isMutation) toast.error('You do not have permission to do that.');
        else console.error('[perm] read rejected — unguarded request:', req.method, req.url, code(err));
      }

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
