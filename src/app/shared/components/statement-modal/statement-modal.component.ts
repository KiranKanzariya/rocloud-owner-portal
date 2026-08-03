import { Component, effect, inject, input, output, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CustomerService } from '../../../features/customers/customer.service';
import { ToastService } from '../../../core/services/toast.service';
import { istMonthStart, istToday } from '../../util/ist-date.util';
import { ModalDirective } from '../../directives/modal.directive';

/**
 * Downloads a customer's delivery statement for a date range — a record of what was supplied, with no
 * ledger effect, so it can be produced repeatedly for overlapping ranges (unlike an invoice). Used from
 * the customer page and from an invoice, where it opens pre-filled with that invoice's period.
 *
 * Fetches the blob itself rather than reusing roc-pdf-preview: the API rejects a range with nothing in
 * it, and that is a routine mistake (wrong month picked). Reading the error body lets the owner see
 * "nothing was delivered between these dates" instead of a blank viewer.
 */
@Component({
  selector: 'roc-statement-modal',
  standalone: true,
  imports: [ModalDirective, ReactiveFormsModule, TranslatePipe],
  templateUrl: './statement-modal.component.html',
})
export class StatementModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly customers = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly open = input(false);
  readonly customer = input<{ id: string; name: string } | null>(null);
  /** Optional starting range — an invoice passes its own period so the statement matches the bill. */
  readonly initialFrom = input<string | null>(null);
  readonly initialTo = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly todayIso = istToday();

  protected readonly form = this.fb.nonNullable.group({
    from: [istMonthStart()],
    to: [istToday()],
  });

  constructor() {
    // Re-seed the range each time it opens, so an invoice's period wins over last time's dates.
    effect(() => {
      if (!this.open()) return;
      this.form.patchValue({
        from: this.initialFrom() ?? istMonthStart(),
        to: this.initialTo() ?? istToday(),
      });
    });
  }

  download(): void {
    const customer = this.customer();
    if (!customer || this.busy()) return;

    const { from, to } = this.form.getRawValue();
    if (!from || !to) {
      this.toast.error(this.t.instant('Please choose a start and end date.'));
      return;
    }
    if (to < from) {
      this.toast.error(this.t.instant('The end date must be on or after the start date.'));
      return;
    }

    this.busy.set(true);
    this.http.get(this.customers.statementUrl(customer.id, from, to), { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.busy.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement-${customer.name}-${from}-${to}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        void this.showError(err);
      },
    });
  }

  /**
   * The response is a blob even on failure (responseType: 'blob'), so the API's JSON error has to be
   * read back out of it — otherwise every failure reads as a generic one.
   */
  private async showError(err: HttpErrorResponse): Promise<void> {
    const fallback = this.t.instant('Could not build the statement.');
    try {
      const text = err.error instanceof Blob ? await err.error.text() : null;
      const parsed = text ? JSON.parse(text) : null;
      const field = parsed?.errors ? Object.values(parsed.errors)[0] : null;
      const message = Array.isArray(field) ? field[0] : parsed?.message;
      this.toast.error(message || fallback);
    } catch {
      this.toast.error(fallback);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
