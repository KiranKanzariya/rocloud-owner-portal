import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PaymentService, CustomerUpiQr } from '../../../core/services/payment.service';
import { ModalDirective } from '../../../shared/directives/modal.directive';

/**
 * The counter QR: a customer standing at the plant scans this and pays what they owe.
 *
 * <p>Every order in a plant-pickup business is collected in person, so the moment that matters is the
 * customer at the counter — long before an invoice PDF exists. The amount is whatever they owe RIGHT
 * NOW, fetched fresh each time the modal opens rather than taken from the row behind it, because that
 * row may have been loaded minutes ago and the money must match the ledger, not a stale screen.</p>
 *
 * <p>The payload comes from the API, not from string-building here: the rules about what may be asked
 * for already exist server-side and are shared with the invoice PDF. The only job in the browser is
 * turning that string into pixels.</p>
 */
@Component({
  selector: 'app-payment-qr-modal',
  standalone: true,
  imports: [ModalDirective, DecimalPipe, RouterLink, TranslatePipe],
  templateUrl: './payment-qr-modal.component.html',
})
export class PaymentQrModalComponent {
  private readonly payments = inject(PaymentService);

  /** The customer to show a QR for; null closes/idles the modal. */
  readonly customerId = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly data = signal<CustomerUpiQr | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  /** The rendered QR as a data URI, or null while loading / when there is nothing to draw. */
  protected readonly qrDataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.customerId();
      this.qrDataUrl.set(null);
      this.data.set(null);
      this.failed.set(false);
      if (!id) return;

      this.loading.set(true);
      this.payments.customerUpiQr(id).subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
          if (d.payload) void this.draw(d.payload);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
    });
  }

  /**
   * Rendered at a generous size and high error correction: this gets scanned off a phone screen held
   * at arm's length across a counter, often in poor light. The library is imported lazily so it lands
   * in this component's chunk rather than the main bundle.
   */
  private async draw(payload: string): Promise<void> {
    try {
      // `qrcode` is a CommonJS package. Under `await import()` the bundler puts its exports on
      // `.default` in some configurations and directly on the namespace in others, so accept both —
      // reading the wrong one yields `undefined` and throws a TypeError at call time, which surfaced
      // as nothing more useful than "could not load".
      const mod = (await import('qrcode')) as unknown as Record<string, unknown>;
      const api = (mod['default'] ?? mod) as { toDataURL?: (t: string, o: object) => Promise<string> };
      if (typeof api.toDataURL !== 'function')
        throw new Error('qrcode module did not expose toDataURL');

      this.qrDataUrl.set(
        await api.toDataURL(payload, { errorCorrectionLevel: 'Q', margin: 1, width: 320 }),
      );
    } catch (err) {
      // Never swallow this silently: the modal can only say "could not load", so without a logged
      // reason a rendering failure is indistinguishable from the request failing.
      console.error('Payment QR render failed', err);
      this.failed.set(true);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
