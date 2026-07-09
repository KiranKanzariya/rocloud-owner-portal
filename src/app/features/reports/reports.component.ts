import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartData, ChartType } from 'chart.js';
import { ReportService, DateRange } from './report.service';
import {
  AreaPerformance,
  BottleTrackingReport,
  DailyCollection,
  DeliveryEfficiency,
  OutstandingDuesReport,
  ReportTab,
  REPORT_TABS,
  TopCustomer,
} from './report.models';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { UpgradeBannerComponent } from '../../shared/components/upgrade-banner/upgrade-banner.component';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { istMonthStart, istToday } from '../../shared/util/ist-date.util';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

const NAVY = '#0C447C';
const TEAL = '#1D9E75';
const AMBER = '#E0A030';
const DANGER = '#D14343';
const MIST = '#9DB2C9';

function monthStart(): string {
  return istMonthStart();
}
function today(): string {
  return istToday();
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DecimalPipe, ChartCardComponent, UpgradeBannerComponent, TranslatePipe],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  private readonly service = inject(ReportService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly perm = inject(PermissionService);

  /** Defense-in-depth: the route already plan-gates this, but we also show an in-page banner. */
  protected readonly isPro = this.perm.hasPlan('Pro');

  protected readonly tabs = REPORT_TABS;
  protected readonly activeTab = signal<ReportTab>('collection');
  protected readonly loading = signal(false);
  protected readonly range = signal<DateRange>({ from: monthStart(), to: today() });

  // Per-report data
  protected readonly collection = signal<DailyCollection[]>([]);
  protected readonly deliveryEff = signal<DeliveryEfficiency[]>([]);
  protected readonly outstanding = signal<OutstandingDuesReport[]>([]);
  protected readonly area = signal<AreaPerformance[]>([]);
  protected readonly topCustomers = signal<TopCustomer[]>([]);
  protected readonly bottles = signal<BottleTrackingReport[]>([]);

  protected readonly chartType = computed<ChartType>(() => {
    switch (this.activeTab()) {
      case 'collection': return 'line';
      case 'outstanding-dues': return 'doughnut';
      default: return 'bar';
    }
  });

  protected readonly chartData = computed<ChartData>(() => {
    switch (this.activeTab()) {
      case 'collection': {
        const rows = this.collection();
        return {
          labels: rows.map((r) => r.date),
          datasets: [
            { label: 'Total', data: rows.map((r) => r.totalCollected), borderColor: NAVY, backgroundColor: NAVY, tension: 0.3 },
            { label: 'Cash', data: rows.map((r) => r.cash), borderColor: TEAL, backgroundColor: TEAL, tension: 0.3 },
            { label: 'Digital', data: rows.map((r) => r.digital), borderColor: AMBER, backgroundColor: AMBER, tension: 0.3 },
          ],
        };
      }
      case 'delivery-efficiency': {
        const rows = this.deliveryEff();
        return {
          labels: rows.map((r) => r.deliveryBoyName),
          datasets: [
            { label: 'Delivered', data: rows.map((r) => r.delivered), backgroundColor: TEAL },
            { label: 'Pending', data: rows.map((r) => r.pending), backgroundColor: AMBER },
            { label: 'Failed', data: rows.map((r) => r.failed), backgroundColor: DANGER },
          ],
        };
      }
      case 'outstanding-dues': {
        const rows = this.outstanding();
        const sum = (sel: (r: OutstandingDuesReport) => number) => rows.reduce((a, r) => a + sel(r), 0);
        return {
          labels: ['0–7 days', '7–30 days', '30–60 days', '60+ days'],
          datasets: [
            {
              data: [sum((r) => r.bucket0To7), sum((r) => r.bucket7To30), sum((r) => r.bucket30To60), sum((r) => r.bucket60Plus)],
              backgroundColor: [TEAL, AMBER, '#D97706', DANGER],
            },
          ],
        };
      }
      case 'area-performance': {
        const rows = this.area();
        return {
          labels: rows.map((r) => r.areaName),
          datasets: [{ label: 'Revenue', data: rows.map((r) => r.revenue), backgroundColor: NAVY }],
        };
      }
      case 'top-customers': {
        const rows = this.topCustomers();
        return {
          labels: rows.map((r) => r.customerName),
          datasets: [{ label: 'Revenue', data: rows.map((r) => r.revenue), backgroundColor: NAVY }],
        };
      }
      case 'bottle-tracking': {
        const rows = this.bottles();
        return {
          labels: rows.map((r) => r.bottleSize),
          datasets: [
            { label: 'Issued', data: rows.map((r) => r.issued), backgroundColor: NAVY },
            { label: 'Returned', data: rows.map((r) => r.returned), backgroundColor: TEAL },
            { label: 'Damaged', data: rows.map((r) => r.damaged), backgroundColor: DANGER },
            { label: 'Missing', data: rows.map((r) => r.missing), backgroundColor: MIST },
          ],
        };
      }
    }
  });

  constructor() {
    this.load();
  }

  selectTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.load();
  }

  setDate(which: 'from' | 'to', value: string): void {
    if (!value) return;
    this.range.update((r) => ({ ...r, [which]: value }));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const r = this.range();
    const done = () => this.loading.set(false);
    const fail = () => this.loading.set(false);

    switch (this.activeTab()) {
      case 'collection':
        this.service.collection(r).subscribe({ next: (d) => { this.collection.set(d); done(); }, error: fail });
        break;
      case 'delivery-efficiency':
        this.service.deliveryEfficiency(r.to).subscribe({ next: (d) => { this.deliveryEff.set(d); done(); }, error: fail });
        break;
      case 'outstanding-dues':
        this.service.outstandingDues(r.to).subscribe({ next: (d) => { this.outstanding.set(d); done(); }, error: fail });
        break;
      case 'area-performance':
        this.service.areaPerformance(r).subscribe({ next: (d) => { this.area.set(d); done(); }, error: fail });
        break;
      case 'top-customers':
        this.service.topCustomers(r).subscribe({ next: (d) => { this.topCustomers.set(d); done(); }, error: fail });
        break;
      case 'bottle-tracking':
        this.service.bottleTracking().subscribe({ next: (d) => { this.bottles.set(d); done(); }, error: fail });
        break;
    }
  }

  export(format: 'csv' | 'xlsx'): void {
    const tab = this.activeTab();
    const url = this.service.exportUrl(tab, format, this.range());
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `${tab}.${format}`;
        a.click();
        URL.revokeObjectURL(objUrl);
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not export the report.')),
    });
  }
}
