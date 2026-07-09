import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DeliveryService } from '../delivery.service';
import { DeliveryListItem } from '../delivery.models';
import { DeliveryDetailModalComponent } from '../delivery-detail-modal/delivery-detail-modal.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { istToday } from '../../../shared/util/ist-date.util';

/**
 * Mobile-first "My route" screen for a delivery boy: their own stops for the day, tap one to
 * record the outcome (reuses the delivery-detail modal). Backed by GET /deliveries/my-route,
 * which is server-restricted to the logged-in boy's deliveries (permission Deliveries.ViewOwn).
 */
@Component({
  selector: 'app-my-route',
  standalone: true,
  imports: [DecimalPipe, DeliveryDetailModalComponent, TranslatePipe, MobilePipe],
  templateUrl: './my-route.component.html',
})
export class MyRouteComponent {
  private readonly service = inject(DeliveryService);

  protected readonly date = signal(istToday());
  protected readonly stops = signal<DeliveryListItem[]>([]);
  protected readonly selected = signal<DeliveryListItem | null>(null);
  protected readonly loading = signal(false);

  // Outstanding stops (Pending / In transit) sort to the top — that's the work left to do.
  private static readonly rank: Record<string, number> = { Pending: 0, InTransit: 1, Delivered: 2, Failed: 3, Skipped: 4 };
  protected readonly sorted = computed(() =>
    [...this.stops()].sort((a, b) => (MyRouteComponent.rank[a.status] ?? 9) - (MyRouteComponent.rank[b.status] ?? 9)),
  );

  protected readonly total = computed(() => this.stops().length);
  protected readonly done = computed(() =>
    this.stops().filter((s) => s.status === 'Delivered' || s.status === 'Failed' || s.status === 'Skipped').length,
  );
  protected readonly remaining = computed(() => this.total() - this.done());

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.myRoute(this.date()).subscribe({
      next: (s) => {
        this.stops.set(s);
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

  statusClass(status: string): string {
    switch (status) {
      case 'Delivered':
        return 'status-delivered';
      case 'Failed':
        return 'status-overdue';
      case 'InTransit':
        return 'status-in-transit';
      default:
        return 'status-pending';
    }
  }

  onCompleted(): void {
    this.selected.set(null);
    this.load();
  }
}
