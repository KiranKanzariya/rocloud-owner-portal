import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Adds X-Requested-With so the API's anti-CSRF middleware accepts mutating requests. */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } }));
};
