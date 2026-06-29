import { Injectable, signal } from '@angular/core';

/**
 * Tracks whether the current (in-memory) session was started by platform staff via "Open as owner"
 * from the admin portal. It drives the impersonation banner. State is intentionally memory-only — an
 * impersonation session has no refresh cookie, so a hard reload ends it (and clears this flag too).
 */
@Injectable({ providedIn: 'root' })
export class ImpersonationService {
  private readonly _active = signal(false);
  private readonly _name = signal('');

  readonly active = this._active.asReadonly();
  readonly ownerName = this._name.asReadonly();

  start(ownerName: string): void {
    this._active.set(true);
    this._name.set(ownerName);
  }

  stop(): void {
    this._active.set(false);
    this._name.set('');
  }
}
