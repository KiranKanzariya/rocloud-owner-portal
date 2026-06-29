import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

/** Maps a notification type to its translatable label ({{count}} interpolation) and icon. */
const NOTIF_META: Record<string, { key: string; icon: string }> = {
  InvoicesOverdue: { key: '{{count}} invoices overdue', icon: 'file-invoice' },
  OrdersPending: { key: '{{count}} orders pending', icon: 'clipboard-list' },
  AmcDue: { key: '{{count}} AMC visits due', icon: 'tool' },
  ServiceOpen: { key: '{{count}} open service requests', icon: 'headset' },
};

@Component({
  selector: 'roc-topbar',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcherComponent],
  template: `
    <header class="h-[50px] shrink-0 bg-white border-b border-ink-light flex items-center gap-3 px-4 sticky top-0 z-30">
      <!-- Mobile sidebar toggle -->
      <button class="md:hidden p-2 -ml-2 rounded-md hover:bg-shell text-ink-mid" (click)="layout.toggleSidebar()" aria-label="Toggle menu">
        <i class="ti ti-menu-2 text-lg"></i>
      </button>

      <!-- Quick-nav: opens the Cmd+K command palette -->
      <button
        class="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 text-body text-ink-mid rounded-md border border-ink-light hover:border-navy-light bg-white"
        (click)="openSearch()">
        <i class="ti ti-search"></i>
        <span class="hidden sm:inline">{{ 'Quick nav…' | translate }}</span>
        <kbd class="ml-auto text-micro border border-ink-light rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>

      <div class="ml-auto flex items-center gap-1">
        <!-- Language switcher (en/hi/gu) -->
        <roc-language-switcher />

        <!-- Notifications (Phase 24) -->
        <div class="relative">
          <button class="relative p-2 rounded-md hover:bg-shell text-ink-mid" (click)="toggleNotif()" aria-label="Notifications">
            <i class="ti ti-bell text-lg"></i>
            @if (unread() > 0) {
              <span class="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-micro font-semibold flex items-center justify-center">{{ unread() }}</span>
            }
          </button>
          @if (notifOpen()) {
            <div class="absolute right-0 mt-1 w-72 bg-white border border-ink-light rounded-md shadow-md z-40">
              <div class="px-3 py-2 border-b border-ink-light text-caption font-semibold text-ink">{{ 'Notifications' | translate }}</div>
              <ul class="max-h-80 overflow-auto py-1">
                @for (n of notifs(); track n.id) {
                  <a [routerLink]="n.link" (click)="notifOpen.set(false)"
                     class="flex items-start gap-2.5 px-3 py-2 hover:bg-shell" [class.bg-foam]="!n.isRead">
                    <i class="ti text-ink-mid mt-0.5" [class]="'ti-' + icon(n.type)"></i>
                    <span class="text-body flex-1">{{ (labelKey(n.type) || n.title) | translate: { count: n.count } }}</span>
                    @if (!n.isRead) { <span class="w-2 h-2 rounded-full bg-teal mt-1.5 shrink-0"></span> }
                  </a>
                } @empty {
                  <li class="px-3 py-6 text-center text-caption text-ink-mid">{{ 'No notifications yet' | translate }}</li>
                }
              </ul>
            </div>
          }
        </div>

        <!-- Settings / account -->
        <div class="relative">
          <button class="p-2 rounded-md hover:bg-shell text-ink-mid" (click)="toggleMenu()" aria-label="Account menu">
            <i class="ti ti-settings text-lg"></i>
          </button>
          @if (menuOpen()) {
            <div class="absolute right-0 mt-1 w-44 bg-white border border-ink-light rounded-md shadow-md py-1 z-40">
              <a routerLink="/settings/profile" (click)="closeMenu()"
                 class="flex items-center gap-2 px-3 py-2 text-body hover:bg-shell">
                <i class="ti ti-user"></i> {{ 'Profile' | translate }}
              </a>
              <a routerLink="/settings/subscription" (click)="closeMenu()"
                 class="flex items-center gap-2 px-3 py-2 text-body hover:bg-shell">
                <i class="ti ti-credit-card"></i> {{ 'Subscription' | translate }}
              </a>
              <button (click)="logout()"
                      class="w-full flex items-center gap-2 px-3 py-2 text-body text-danger hover:bg-shell">
                <i class="ti ti-logout"></i> {{ 'Sign out' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  protected readonly layout = inject(LayoutService);

  protected readonly menuOpen = signal(false);
  protected readonly notifOpen = signal(false);
  protected readonly notifs = signal<AppNotification[]>([]);
  protected readonly unread = signal(0);

  constructor() {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.notifications.feed().subscribe({
      next: (f) => {
        this.notifs.set(f.items);
        this.unread.set(f.unreadCount);
      },
      error: () => {
        // Feed is best-effort — a failure shouldn't break the top bar.
      },
    });
  }

  toggleNotif(): void {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening) {
      this.menuOpen.set(false);
      this.loadNotifications();
      // Mark read once the user opens the panel; clear the badge optimistically.
      if (this.unread() > 0) {
        this.notifications.markAllRead().subscribe();
        this.unread.set(0);
      }
    }
  }

  labelKey(type: string): string | null {
    return NOTIF_META[type]?.key ?? null;
  }

  icon(type: string): string {
    return NOTIF_META[type]?.icon ?? 'bell';
  }

  openSearch(): void {
    this.layout.openPalette();
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    if (this.menuOpen()) this.notifOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
