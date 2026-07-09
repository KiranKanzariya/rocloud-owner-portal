import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../order.service';
import { OrderDetail } from '../order.models';
import { CanDirective } from '../../../shared/directives/can.directive';
import { NavigationService } from '../../../core/services/navigation.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, CanDirective, TranslatePipe],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent {
  private readonly service = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly nav = inject(NavigationService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly order = signal<OrderDetail | null>(null);
  private readonly id = this.route.snapshot.paramMap.get('id')!;

  constructor() {
    this.reload();
  }

  /** Returns to wherever the user came from (e.g. the customer's order-history tab); else the list. */
  back(): void {
    this.nav.back('/orders');
  }

  reload(): void {
    this.service.get(this.id).subscribe((o) => this.order.set(o));
  }

  cancel(): void {
    this.service.cancel(this.id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('Order cancelled.'));
        this.reload();
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Only pending orders can be cancelled.')),
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Delivered': return 'status-delivered';
      case 'Pending':
      case 'Confirmed': return 'status-pending';
      case 'InTransit': return 'status-in-transit';
      default: return 'status-overdue';
    }
  }

  paymentClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-active';
      case 'Partial': return 'status-pending';
      case 'Unpaid': return 'status-overdue';
      case 'Invoiced': return 'text-caption text-ink-mid';
      default: return 'text-micro text-ink-mid';
    }
  }
}
