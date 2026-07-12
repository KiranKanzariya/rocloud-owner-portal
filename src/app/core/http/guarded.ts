import { Observable, of } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { environment } from '../../../environments/environment';

/**
 * Runs `call` only when the user holds one of `required`; otherwise resolves to `fallback` without
 * touching the network.
 *
 * The JWT already carries every permission, so the client can answer "am I allowed to ask this?"
 * before asking. Firing the request anyway and catching the 403 makes the errorInterceptor toast
 * "You do not have permission to do that." at a user who merely opened a page.
 *
 * `fallback` must be the *correct answer* for someone without the permission (usually an empty
 * list) — never a way to paper over a failure. If an empty result would leave the UI broken, the
 * permission model is wrong and belongs fixed on the API, not hidden here.
 *
 * Pass the same codes the endpoint's [RequirePermission] / [RequireAnyPermission] declares.
 */
export function guarded<T>(
  perms: PermissionService,
  required: string | string[],
  call: () => Observable<T>,
  fallback: T,
): Observable<T> {
  const codes = Array.isArray(required) ? required : [required];
  if (perms.canAny(...codes)) return call();

  if (!environment.production) console.warn(`[perm] request skipped — needs one of: ${codes.join(', ')}`);
  return of(fallback);
}
