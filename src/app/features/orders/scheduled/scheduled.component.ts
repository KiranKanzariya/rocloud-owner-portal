import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { OrderService } from '../order.service';
import { ProductionPlanDay, UpcomingOrder } from '../order.models';

type Tab = 'upcoming' | 'plan';

/** A day-grouped bucket of upcoming bookings for the "Upcoming" tab. */
interface UpcomingGroup {
  date: string;
  orders: UpcomingOrder[];
  totalItems: number;
}

/**
 * Scheduled orders — the home for future-dated (Advance) bookings that aren't on today's delivery
 * board yet. Two tabs: "Upcoming" (the bookings themselves, grouped by day) and "Production plan"
 * (per-day, per-product totals so the plant can prepare stock ahead).
 */
@Component({
  selector: 'app-scheduled',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './scheduled.component.html',
})
export class ScheduledComponent {
  private readonly service = inject(OrderService);
  protected readonly router = inject(Router);

  protected readonly tab = signal<Tab>('upcoming');
  protected readonly loading = signal(false);

  protected readonly upcoming = signal<UpcomingOrder[]>([]);
  protected readonly plan = signal<ProductionPlanDay[]>([]);
  /** Which production-plan day is expanded to show its customer bookings. */
  protected readonly expandedDay = signal<string | null>(null);

  /** Upcoming bookings grouped by delivery date, ascending. */
  protected readonly upcomingGroups = computed<UpcomingGroup[]>(() => {
    const map = new Map<string, UpcomingOrder[]>();
    for (const o of this.upcoming()) {
      (map.get(o.orderDate) ?? map.set(o.orderDate, []).get(o.orderDate)!).push(o);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, orders]) => ({
        date,
        orders,
        totalItems: orders.reduce((s, o) => s + o.itemCount, 0),
      }));
  });

  protected readonly planTotalUnits = computed(() => this.plan().reduce((s, d) => s + d.totalUnits, 0));

  constructor() {
    this.loadUpcoming();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    if (t === 'upcoming' && !this.upcoming().length) this.loadUpcoming();
    if (t === 'plan' && !this.plan().length) this.loadPlan();
  }

  private loadUpcoming(): void {
    this.loading.set(true);
    this.service.upcoming(90).subscribe({
      next: (rows) => {
        this.upcoming.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPlan(): void {
    this.loading.set(true);
    this.service.productionPlan().subscribe({
      next: (days) => {
        this.plan.set(days);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleDay(date: string): void {
    this.expandedDay.update((d) => (d === date ? null : date));
  }

  open(o: UpcomingOrder): void {
    this.router.navigate(['/orders', o.id]);
  }

  typeClass(type: string): string {
    return type === 'Advance' ? 'bg-foam text-navy' : 'bg-shell text-ink-mid';
  }
}
