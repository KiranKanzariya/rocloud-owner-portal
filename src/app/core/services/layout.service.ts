import { Injectable, signal } from '@angular/core';

/** Shared UI/layout state (guide §25 polish): the mobile sidebar drawer + the Cmd+K palette. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Whether the sidebar drawer is open on mobile. Ignored at >=768px (sidebar is always shown). */
  readonly sidebarOpen = signal(false);

  /** Whether the Cmd/Ctrl+K command palette is open. */
  readonly paletteOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  openPalette(): void {
    this.paletteOpen.set(true);
  }

  togglePalette(): void {
    this.paletteOpen.update((v) => !v);
  }

  closePalette(): void {
    this.paletteOpen.set(false);
  }
}
