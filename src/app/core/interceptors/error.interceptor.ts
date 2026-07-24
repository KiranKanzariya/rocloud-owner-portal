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
 *  - Workspace blocked (402 PAYMENT_REQUIRED, 401 TENANT_SUSPENDED, 401 TENANT_CANCELLED) → the owner
 *    goes to the subscription page, which stays reachable so they can pay to restore access
 *    (guide §25); everyone else goes to /suspended, since they cannot clear the block.
 *  - 403 TENANT_BLOCKED → a non-owner was refused a session at sign-in; the login screen shows why.
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

  // The subscription page is Owner-only, so only the Owner may be sent there. Used for nudges that are
  // not a hard block (e.g. a plan limit) — everyone else just keeps the toast and stays put.
  const goToSubscription = (): void => {
    if (!perms.isOwner()) return;
    if (!router.url.startsWith('/settings/subscription')) void router.navigate(['/settings/subscription']);
  };

  // The whole workspace is blocked. The Owner goes to the subscription page, which stays reachable so
  // they can pay. Anyone else cannot pay, so they get the /suspended dead-end instead: one page saying
  // what is wrong and who to ask, rather than a shell where every widget fails and each failed request
  // fires another toast.
  const goToBlockedPage = (reason: 'suspended' | 'overdue' | 'cancelled'): void => {
    if (perms.isOwner()) return goToSubscription();
    // Drop the token now rather than leaving it to expire. It is already inert — the tenant check runs
    // ahead of authorization, so every request 401s whether or not it is valid — but a session that
    // outlives the access it stood for is just litter. Must run AFTER the isOwner() read above, which
    // reads the permissions this clears.
    auth.clearSession();
    if (!router.url.startsWith('/suspended')) void router.navigate(['/suspended'], { queryParams: { reason } });
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
      // A non-owner was refused a session on a blocked workspace (API: TenantBlockedException). Answered
      // before the read/write split below, or the sign-in POST would draw a misleading "no permission"
      // toast on top of the login screen's own message.
      if (err.status === 403 && code(err) === 'TENANT_BLOCKED') {
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
        goToBlockedPage('overdue');
        return throwError(() => err);
      }

      // Suspended for non-payment: the owner can still self-pay to reactivate → subscription page.
      if (err.status === 401 && code(err) === 'TENANT_SUSPENDED') {
        toast.error('Your account is suspended for non-payment — renew to reactivate.');
        goToBlockedPage('suspended');
        return throwError(() => err);
      }

      // Cancelled & period ended: the owner can re-subscribe to reclaim the workspace → subscribe.
      if (err.status === 401 && code(err) === 'TENANT_CANCELLED') {
        toast.error('Your subscription has ended — subscribe to reactivate your workspace.');
        goToBlockedPage('cancelled');
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
