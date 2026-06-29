import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const RESERVED = new Set(['localhost', 'app', 'www', 'api', 'admin']);

/** Resolves the tenant subdomain from the host and sends it as X-Tenant on API calls. */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const label = window.location.hostname.split('.')[0];
  if (!label || RESERVED.has(label.toLowerCase())) return next(req);

  return next(req.clone({ setHeaders: { 'X-Tenant': label } }));
};
