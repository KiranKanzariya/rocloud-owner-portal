import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface NotificationTemplate {
  id: string;
  templateCode: string;
  languageCode: string;
  channel: string; // Email | SMS | WhatsApp
  subject: string | null;
  body: string;
  updatedAt: string | null;
  isCustom: boolean; // true = this tenant's override; false = inherited system default
}

export interface UpsertNotificationTemplate {
  templateCode: string;
  languageCode: string;
  channel: string;
  subject?: string | null;
  body: string;
}

/** Per-tenant notification templates (guide §24). Requires Settings.View/Manage. */
@Injectable({ providedIn: 'root' })
export class NotificationTemplateService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notification-templates`;

  list(): Observable<NotificationTemplate[]> {
    return this.http.get<ApiResponse<NotificationTemplate[]>>(this.base).pipe(map((r) => r.data ?? []));
  }

  upsert(body: UpsertNotificationTemplate): Observable<{ id: string }> {
    return this.http.put<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  /** Delete this tenant's override, reverting the template to the system default. */
  remove(id: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`);
  }
}
