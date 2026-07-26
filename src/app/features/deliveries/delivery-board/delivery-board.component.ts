import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { DeliveryService } from '../delivery.service';
import { DeliveryBoard, DeliveryListItem } from '../delivery.models';
import { DeliveryDetailModalComponent } from '../delivery-detail-modal/delivery-detail-modal.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { istToday } from '../../../shared/util/ist-date.util';

@Component({
  selector: 'app-delivery-board',
  standalone: true,
  imports: [DecimalPipe, DeliveryDetailModalComponent, TranslatePipe, MobilePipe],
  templateUrl: './delivery-board.component.html',
})
export class DeliveryBoardComponent {
  private readonly service = inject(DeliveryService);
  protected readonly router = inject(Router);

  protected readonly date = signal(istToday());
  protected readonly board = signal<DeliveryBoard>({ pending: [], inTransit: [], delivered: [], failed: [], pickups: [], toDeliver: [] });
  protected readonly selected = signal<DeliveryListItem | null>(null);
  protected readonly loading = signal(false);

  /** Grand total of jars still to be delivered across all outstanding stops. */
  protected readonly totalToDeliver = computed(() =>
    (this.board().toDeliver ?? []).reduce((sum, t) => sum + t.quantity, 0),
  );

  /**
   * Which mode the board is focused on. A tenant running BOTH modes otherwise has to scroll past the
   * whole home-delivery Kanban to reach plant pickups (and back) every time a walk-in arrives.
   */
  protected readonly mode = signal<'all' | 'home' | 'pickup'>('all');

  protected readonly homeCount = computed(() => {
    const b = this.board();
    return b.pending.length + b.inTransit.length + b.delivered.length + b.failed.length;
  });
  protected readonly pickupCount = computed(() => this.board().pickups?.length ?? 0);

  /**
   * Pickups shown awaiting-first, then completed. The flat grid otherwise mixes still-to-collect cards
   * among Delivered/Failed ones in API order, so the owner has to hunt for what still needs doing.
   * Completed cards fall below, most recently actioned first (deliveredAt is the best "last updated"
   * proxy on the list item). Awaiting cards keep their incoming order (JS sort is stable).
   */
  protected readonly sortedPickups = computed(() => {
    const done = (s: string): boolean => s === 'Delivered' || s === 'Failed';
    return [...(this.board().pickups ?? [])].sort((a, b) => {
      if (done(a.status) !== done(b.status)) return done(a.status) ? 1 : -1;   // awaiting first
      if (!done(a.status)) return 0;                                           // both awaiting → keep order
      return (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? '');         // both done → newest first
    });
  });

  /** Only worth showing the switcher when the day actually has both kinds of work. */
  protected readonly showModeFilter = computed(() => this.homeCount() > 0 && this.pickupCount() > 0);

  protected readonly showHome = computed(() => {
    if (this.showModeFilter()) return this.mode() !== 'pickup';
    // Pickup-only day: don't spend the top of the screen on four empty status columns — that pushes
    // the actual work below the fold. Keep them only when there is nothing else to show, so a day
    // with no deliveries at all still renders a board instead of a blank page.
    return this.homeCount() > 0 || this.pickupCount() === 0;
  });

  protected readonly showPickups = computed(() => !this.showModeFilter() || this.mode() !== 'home');

  constructor() {
    this.load();
    // Live updates every 30s; skip when the tab is hidden to avoid wasted calls.
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (!document.hidden) this.load();
      });
  }

  load(): void {
    this.loading.set(true);
    this.service.board(this.date()).subscribe({
      next: (b) => {
        this.board.set(b);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changeDate(value: string): void {
    if (value) {
      this.date.set(value);
      this.load();
    }
  }

  onCompleted(): void {
    this.selected.set(null);
    this.load();
  }
}
