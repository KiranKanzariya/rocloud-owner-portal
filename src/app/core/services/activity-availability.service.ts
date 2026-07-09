import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

/**
 * Tracks whether the SuperAdmin has the activity log enabled. Drives the sidebar item and the route
 * guard so that when logging is off, owners see neither the menu item nor the page. Fail-open: if the
 * check can't be made, the menu stays visible.
 */
@Injectable({ providedIn: 'root' })
export class ActivityAvailabilityService {
  private readonly http = inject(HttpClient);

  /** Reactive flag for the sidebar (defaults to true until the first load resolves). */
  readonly enabled = signal(true);

  private cache$?: Observable<boolean>;

  load(): Observable<boolean> {
    this.cache$ ??= this.http
      .get<ApiResponse<{ enabled: boolean }>>(`${environment.apiUrl}/audit-logs/availability`)
      .pipe(
        map((r) => r.data?.enabled ?? true),
        tap((v) => this.enabled.set(v)),
        catchError(() => of(true)),
        shareReplay(1),
      );
    return this.cache$;
  }
}
