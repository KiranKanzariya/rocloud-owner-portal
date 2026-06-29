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
 *  - 402 / 403 → toast.
 * Requests to /auth/* are exempt from the refresh dance (login/refresh handle their own 401s).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = inject(TokenService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const isAuthEndpoint = req.url.includes('/auth/');

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403) toast.error('You do not have permission to do that.');
      if (err.status === 402) toast.error('Payment required — please update your subscription.');

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
