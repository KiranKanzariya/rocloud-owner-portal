import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TokenService } from '../services/token.service';

/**
 * Attaches the bearer token and sends credentials (so the HttpOnly refresh cookie flows
 * cross-origin) on calls to our API only.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const token = inject(TokenService).getToken();
  return next(
    req.clone({
      withCredentials: true,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
};
