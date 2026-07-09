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
