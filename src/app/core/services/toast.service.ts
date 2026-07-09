import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

/** Lightweight signal-based toasts (guide §18 — error/permission notices). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', durationMs = 4000): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  /**
   * Error toast for a failed HTTP request that shows the API's *real* reason when it has one,
   * falling back to a friendly message otherwise. Prefers a field-level validation message, then the
   * server's `error` string. Skips 401/402/403 (surfaced by the error interceptor — avoids a double
   * toast); shows the fallback for 5xx / network failures where the server has no useful message.
   */
  apiError(err: unknown, fallback: string): void {
    const e = err as { status?: number; error?: unknown } | null;
    const status = e?.status ?? 0;
    if (status === 401 || status === 402 || status === 403) return; // handled by the error interceptor
    const server = status >= 400 && status < 500 ? ToastService.serverMessage(e?.error) : null;
    this.error(server ?? fallback);
  }

  private static serverMessage(body: unknown): string | null {
    if (!body) return null;
    if (typeof body === 'string') return body.trim() || null;
    const b = body as { errors?: Record<string, string[]>; error?: string };
    if (b.errors && typeof b.errors === 'object') {
      const first = Object.values(b.errors)[0];
      if (Array.isArray(first) && first.length && typeof first[0] === 'string') return first[0];
    }
    return typeof b.error === 'string' && b.error.trim() ? b.error : null;
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
