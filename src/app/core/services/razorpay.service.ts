import { Injectable } from '@angular/core';
import { SubscriptionInitiate } from './subscription.service';

declare global {
  interface Window {
    // Razorpay Checkout global, injected by checkout.js.
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Razorpay Checkout integration (guide §25). Loads checkout.js on demand and opens the widget.
 *
 * When the backend reports DevMode (placeholder keys), there is no real payment to make, so we
 * resolve success immediately — letting the upgrade → refresh-JWT flow run end-to-end in dev.
 * With live keys, the real Checkout opens and we resolve on payment success / reject on dismiss.
 */
@Injectable({ providedIn: 'root' })
export class RazorpayService {
  private scriptPromise: Promise<boolean> | null = null;

  /** Opens checkout for the given plan; resolves true on success, false on dismiss/failure. */
  async pay(init: SubscriptionInitiate, prefill: { name?: string; email?: string }): Promise<boolean> {
    if (init.devMode || !init.orderId) {
      // No live gateway configured — simulate a successful payment (dev only).
      return true;
    }

    const loaded = await this.loadScript();
    if (!loaded || !window.Razorpay) return false;

    return new Promise<boolean>((resolve) => {
      const rzp = new window.Razorpay!({
        key: init.keyId,
        order_id: init.orderId,
        name: 'ROCloud',
        description: `${init.planType} plan`,
        prefill: { name: prefill.name ?? '', email: prefill.email ?? '' },
        theme: { color: '#0C447C' },
        handler: () => resolve(true),
        modal: { ondismiss: () => resolve(false) },
      });
      rzp.open();
    });
  }

  private loadScript(): Promise<boolean> {
    if (this.scriptPromise) return this.scriptPromise;
    this.scriptPromise = new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
    return this.scriptPromise;
  }
}
