import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

/** One in-app notification. The portal renders a translated label from `type` + `count`. */
export interface AppNotification {
  id: string;
  type: string; // InvoicesOverdue | OrdersPending | AmcDue | ServiceOpen
  count: number;
  title: string; // English fallback if `type` is unknown to the portal
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  unreadCount: number;
  items: AppNotification[];
}

/** The owner's in-app notification feed (guide §24) — the top-bar bell. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  feed(): Observable<NotificationFeed> {
    return this.http
      .get<ApiResponse<NotificationFeed>>(this.base)
      .pipe(map((r) => r.data ?? { unreadCount: 0, items: [] }));
  }

  markAllRead(): Observable<number> {
    return this.http
      .post<ApiResponse<{ marked: number }>>(`${this.base}/read`, {})
      .pipe(map((r) => r.data?.marked ?? 0));
  }
}
