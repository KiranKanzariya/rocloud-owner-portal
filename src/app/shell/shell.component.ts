import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { CommandPaletteComponent } from '../shared/components/command-palette/command-palette.component';
import { ImpersonationBannerComponent } from '../shared/components/impersonation-banner/impersonation-banner.component';
import { LayoutService } from '../core/services/layout.service';

/** Authenticated app shell: 220px sidebar + 50px topbar + scrollable content (guide §19, §25). */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, CommandPaletteComponent, ImpersonationBannerComponent],
  template: `
    <!-- Lock the shell to the viewport; only <main> scrolls so the topbar/sidebar stay fixed. -->
    <div class="flex flex-col h-screen overflow-hidden bg-shell">
      <roc-impersonation-banner />

      <div class="flex flex-1 min-h-0">
        <roc-sidebar />

        <!-- Mobile drawer backdrop -->
        @if (layout.sidebarOpen()) {
          <div class="fixed inset-0 z-40 bg-black/40 md:hidden" (click)="layout.closeSidebar()"></div>
        }

        <div class="flex-1 flex flex-col min-w-0">
          <roc-topbar />
          <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>

    <roc-command-palette />
  `,
})
export class ShellComponent {
  protected readonly layout = inject(LayoutService);
}
