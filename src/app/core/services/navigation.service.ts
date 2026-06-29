import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

/** Shared "go back to where the user came from" navigation for detail/form pages. */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /**
   * Returns to the previous in-app page. Falls back to `fallback` on a direct load / refresh, where
   * there is no in-app history to return to (id 1 = the first navigation of the session).
   */
  back(fallback: string | readonly unknown[]): void {
    if ((this.router.lastSuccessfulNavigation()?.id ?? 1) > 1) {
      this.location.back();
    } else {
      this.router.navigate(Array.isArray(fallback) ? [...fallback] : [fallback]);
    }
  }
}
