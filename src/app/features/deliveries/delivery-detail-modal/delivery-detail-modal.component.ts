import { ChangeDetectorRef, Component, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DeliveryService } from '../delivery.service';
import { DeliveryDetail, DeliveryItemInput, DeliveryListItem, OtherReturnInput, UpdateDeliveryStatus } from '../delivery.models';
import { OrderService } from '../../orders/order.service';
import { CustomerService } from '../../customers/customer.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { CanDirective } from '../../../shared/directives/can.directive';

type Choice = 'InTransit' | 'Delivered' | 'Failed';

@Component({
  selector: 'app-delivery-detail-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, TranslatePipe, MobilePipe, CanDirective],
  templateUrl: './delivery-detail-modal.component.html',
})
export class DeliveryDetailModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DeliveryService);
  private readonly orders = inject(OrderService);
  private readonly customers = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly delivery = input<DeliveryListItem | null>(null);
  readonly completed = output<void>();
  readonly closed = output<void>();

  protected readonly paymentMethods = ['Cash', 'UPI', 'Card', 'Online', 'BankTransfer'];
  protected readonly choice = signal<Choice | null>(null);
  protected readonly saving = signal(false);
  protected readonly file = signal<File | null>(null);
  /** Read-only summary of an already-Delivered stop; null while loading or when editing. */
  protected readonly detail = signal<DeliveryDetail | null>(null);
  /** False = show the read-only summary (completed stop); true = show the editable status form. */
  protected readonly editing = signal(false);
  private lat: number | null = null;
  private lng: number | null = null;
  /** Guards against a slow item load for a previous delivery overwriting the current one's lines. */
  private loadSeq = 0;

  /** One row per order item: product name + ordered qty (display) and the delivered/returned inputs. */
  protected readonly lines = this.fb.array<FormGroup>([]);

  /** One row per OTHER jar product the customer still holds (not on this order), with a returned input. */
  protected readonly otherLines = this.fb.array<FormGroup>([]);

  protected readonly form = this.fb.nonNullable.group({
    collectedAmount: [0],
    paymentMethod: ['Cash'],
    notes: [''],
  });

  constructor() {
    // When a different delivery is opened, reset the form and load that order's items for per-item entry.
    effect(() => {
      const d = this.delivery();
      this.loadSeq++; // invalidate any in-flight item load for the previous delivery
      this.choice.set(null);
      this.file.set(null);
      this.lines.clear();
      this.otherLines.clear();
      this.detail.set(null);
      this.editing.set(false);
      this.form.reset({ collectedAmount: 0, paymentMethod: 'Cash', notes: '' });
      if (!d) return;
      if (d.status === 'Delivered' || d.status === 'Failed') {
        this.loadDetail(d.id); // completed → show the read-only summary first
      } else {
        this.editing.set(true); // pending / in-transit → go straight to the editable form
        this.loadItems(d);
      }
    });
  }

  /** Loads what was recorded at a completed stop for the read-only summary. */
  private loadDetail(id: string): void {
    const seq = ++this.loadSeq;
    this.service.detail(id).subscribe({
      next: (det) => { if (seq === this.loadSeq) this.detail.set(det); },
      error: () => { if (seq === this.loadSeq) this.editing.set(true); }, // fall back to the form if it fails
    });
  }

  /** Switches a completed stop from the summary into the editable form, pre-selected to its status. */
  edit(): void {
    const d = this.delivery();
    if (!d) return;
    this.editing.set(true);
    if (d.status === 'Failed') {
      // Re-open as a Failed edit with the saved reason pre-filled (option 1).
      this.choice.set('Failed');
      this.form.controls.notes.setValue(this.detail()?.notes ?? '');
    } else {
      this.choice.set('Delivered');
      this.captureLocation();
      this.loadItems(d);
    }
  }

  private loadItems(d: DeliveryListItem): void {
    const seq = ++this.loadSeq;
    this.orders.get(d.orderId).subscribe((o) => {
      // A different delivery was opened before this finished loading — drop the stale response.
      if (seq !== this.loadSeq) return;
      this.lines.clear();
      for (const it of o.items) {
        this.lines.push(
          this.fb.group({
            orderItemId: [it.id],
            productId: [it.productId],
            productName: [it.productName],
            ordered: [it.quantity],
            held: [null as number | null], // how many empties the customer still holds (filled below)
            delivered: [it.quantity], // default to delivering everything ordered
            returned: [0],
          }),
        );
      }
      // Zoneless: a FormArray push doesn't notify Angular, so the preview/per-item rows won't
      // render until we trigger a check. Held balances arrive separately and check again below.
      this.cdr.markForCheck();
      const orderProductIds = new Set(o.items.map((it) => it.productId));
      this.loadHeldBalances(d.customerId, orderProductIds, seq);
    });
  }

  /**
   * Fills the "holds N" count on each order line and lists jars the customer still holds for products
   * NOT on this order (so they can be returned too). Degrades quietly if jar-balance isn't permitted.
   */
  private loadHeldBalances(customerId: string, orderProductIds: Set<string>, seq: number): void {
    this.customers.jarBalance(customerId).subscribe({
      next: (balances) => {
        if (seq !== this.loadSeq) return;
        const held = new Map(balances.map((b) => [b.productId, b.outstanding]));
        // Show how many empties the customer holds for each ordered product.
        for (const line of this.lines.controls) {
          line.get('held')?.setValue(held.get(line.value.productId) ?? 0, { emitEvent: false });
        }
        // List the OTHER products the customer holds (not on this order).
        this.otherLines.clear();
        for (const b of balances) {
          if (orderProductIds.has(b.productId)) continue;
          this.otherLines.push(
            this.fb.group({
              productId: [b.productId],
              productName: [b.productName],
              bottleSize: [b.bottleSize],
              held: [b.outstanding],
              returned: [0],
            }),
          );
        }
        this.cdr.markForCheck(); // reflect the filled "holds" counts + other-empties rows (zoneless)
      },
      error: () => {
        /* no Customers.View permission — order lines still work, just without the holds hint */
      },
    });
  }

  pick(choice: Choice): void {
    this.choice.set(choice);
    if (choice === 'Delivered') this.captureLocation();
  }

  private captureLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
      },
      () => {
        /* permission denied — proceed without coordinates */
      },
    );
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  submit(): void {
    const d = this.delivery();
    const choice = this.choice();
    if (!d || !choice || this.saving()) return;

    const dto: UpdateDeliveryStatus = { status: choice };
    if (choice === 'Failed') {
      dto.notes = this.form.getRawValue().notes || null;
    }
    if (choice === 'Delivered') {
      const v = this.form.getRawValue();
      const items: DeliveryItemInput[] = this.lines.controls.map((g) => ({
        orderItemId: g.value.orderItemId,
        jarsDelivered: Number(g.value.delivered) || 0,
        jarsReturned: Number(g.value.returned) || 0,
      }));
      // Empties returned for products not on this order (e.g. a 20L during an 18L delivery).
      const otherReturns: OtherReturnInput[] = this.otherLines.controls
        .map((g) => ({ productId: g.value.productId as string, quantity: Number(g.value.returned) || 0 }))
        .filter((r) => r.quantity > 0);
      Object.assign(dto, {
        collectedAmount: v.collectedAmount,
        paymentMethod: v.collectedAmount > 0 ? v.paymentMethod : null,
        notes: v.notes || null,
        latitude: this.lat,
        longitude: this.lng,
        items,
        otherReturns: otherReturns.length ? otherReturns : null,
      });
    }

    this.saving.set(true);
    const proof = this.file();
    if (choice === 'Delivered' && proof) {
      // Upload the proof first, then attach its stored path to the status update.
      this.service.uploadProof(d.id, proof).subscribe({
        next: (res) => this.patch(d.id, { ...dto, proofImageUrl: res.proofImageUrl }),
        error: () => {
          this.saving.set(false);
          this.toast.error(this.t.instant('Proof upload failed (must be a JPG/PNG/WebP under 5 MB).'));
        },
      });
    } else {
      this.patch(d.id, dto);
    }
  }

  private patch(id: string, dto: UpdateDeliveryStatus): void {
    this.service.updateStatus(id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.t.instant('Delivery updated.'));
        this.completed.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.t.instant('Could not update the delivery.'));
      },
    });
  }
}
