import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response';
import {
  AreaPerformance,
  BottleTrackingReport,
  DailyCollection,
  DeliveryEfficiency,
  OutstandingDuesReport,
  ReportTab,
  TopCustomer,
} from './report.models';

export interface DateRange {
  from: string;
  to: string;
}

/** Reporting reads + exports (guide §23). Pro/Enterprise only — gated by route + plan. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  private range(r: DateRange): HttpParams {
    return new HttpParams().set('from', r.from).set('to', r.to);
  }

  collection(r: DateRange): Observable<DailyCollection[]> {
    return this.http
      .get<ApiResponse<DailyCollection[]>>(`${this.base}/collection`, { params: this.range(r) })
      .pipe(map((res) => res.data ?? []));
  }

  deliveryEfficiency(date?: string): Observable<DeliveryEfficiency[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http
      .get<ApiResponse<DeliveryEfficiency[]>>(`${this.base}/delivery-efficiency`, { params })
      .pipe(map((res) => res.data ?? []));
  }

  outstandingDues(asOf?: string): Observable<OutstandingDuesReport[]> {
    const params = asOf ? new HttpParams().set('asOf', asOf) : undefined;
    return this.http
      .get<ApiResponse<OutstandingDuesReport[]>>(`${this.base}/outstanding-dues`, { params })
      .pipe(map((res) => res.data ?? []));
  }

  areaPerformance(r: DateRange): Observable<AreaPerformance[]> {
    return this.http
      .get<ApiResponse<AreaPerformance[]>>(`${this.base}/area-performance`, { params: this.range(r) })
      .pipe(map((res) => res.data ?? []));
  }

  topCustomers(r: DateRange): Observable<TopCustomer[]> {
    return this.http
      .get<ApiResponse<TopCustomer[]>>(`${this.base}/top-customers`, { params: this.range(r) })
      .pipe(map((res) => res.data ?? []));
  }

  bottleTracking(): Observable<BottleTrackingReport[]> {
    return this.http
      .get<ApiResponse<BottleTrackingReport[]>>(`${this.base}/bottle-tracking`)
      .pipe(map((res) => res.data ?? []));
  }

  /** Builds the export download URL with the right params for the active report/range. */
  exportUrl(report: ReportTab, format: 'csv' | 'xlsx', r: DateRange): string {
    return `${this.base}/${report}/export?format=${format}&from=${r.from}&to=${r.to}`;
  }
}
