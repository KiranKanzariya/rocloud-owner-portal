import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { CustomerDetail, CustomerDiscountType, CustomerJarBalance, CustomerStats, CustomerSubscription, OpeningBalance } from '../customer.models';
import { OrderService } from '../../orders/order.service';
import { OrderListItem } from '../../orders/order.models';
import { InventoryService } from '../../inventory/inventory.service';
import { InventoryMovement } from '../../inventory/inventory.models';
import { ServiceRequestService } from '../../service-requests/service-request.service';
import { ServiceRequestListItem } from '../../service-requests/service-request.models';
import { ServiceDetailModalComponent } from '../../service-requests/service-detail-modal/service-detail-modal.component';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product';
import { NavigationService } from '../../../core/services/navigation.service';
import { BottleBadgeComponent } from '../../../shared/components/bottle-badge/bottle-badge.component';
import { CollectPaymentModalComponent } from '../../payments/collect-payment-modal/collect-payment-modal.component';
import { CanDirective } from '../../../shared/directives/can.directive';
import { AnimateOnChangeDirective } from '../../../shared/directives/animate-on-change.directive';
import { PulseOnChangeDirective } from '../../../shared/directives/pulse-on-change.directive';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BottleSize } from '../../../core/models/bottle-size';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { istToday } from '../../../shared/util/ist-date.util';

type Tab = 'overview' | 'subscriptions' | 'orders' | 'returns' | 'payments' | 'service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, BottleBadgeComponent, CollectPaymentModalComponent, ServiceDetailModalComponent, CanDirective, AnimateOnChangeDirective, PulseOnChangeDirective, TranslatePipe, MobilePipe],
  templateUrl: './customer-detail.component.html',
})
export class CustomerDetailComponent {
  private readonly service = inject(CustomerService);
  private readonly orders = inject(OrderService);
  private readonly inventory = inject(InventoryService);
  private readonly serviceRequests = inject(ServiceRequestService);
  private readonly productsApi = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly nav = inject(NavigationService);
  protected readonly router = inject(Router);

  /** Returns to wherever the user came from (customer list, an order detail, …); else the list. */
  back(): void {
    this.nav.back('/customers');
  }

  protected readonly customer = signal<CustomerDetail | null>(null);
  protected readonly stats = signal<CustomerStats | null>(null);
  protected readonly tab = signal<Tab>('overview');
  protected readonly savingDiscount = signal(false);
  protected readonly showPayment = signal(false);

  // Add-subscription form (recurring delivery → nightly auto-orders).
  protected readonly products = signal<Product[]>([]);
  protected readonly showSubForm = signal(false);
  protected readonly savingSub = signal(false);
  protected readonly frequencies = ['Daily', 'AlternateDay', 'Weekly', 'Monthly'];
  protected subProductId = '';
  protected subQuantity = 1;
  protected subFrequency = 'Daily';
  protected subRate: number | null = null;
  // Set while editing an existing subscription (product stays fixed); null = adding a new one.
  protected readonly editingSubId = signal<string | null>(null);
  protected editingSubProductName = '';

  // Returnable jars the customer still holds (per product) + the per-row return quantity.
  protected readonly jarBalances = signal<CustomerJarBalance[]>([]);
  protected readonly returning = signal(false);

  // ── Opening balance (migration) ─────────────────────────────────────────
  protected readonly openingBalance = signal<OpeningBalance | null>(null);
  protected readonly showOpeningForm = signal(false);
  protected readonly savingOpening = signal(false);
  protected readonly clearingOpening = signal(false);
  protected openingCutover = istToday();
  protected openingJarQty: Record<string, number> = {}; // productId → qty held
  protected openingDues = 0;
  protected openingNote = '';
  protected returnQty: Record<string, number> = {};
  // Per-row flag: was the returned jar damaged? Damaged returns are written off, not re-stocked.
  protected returnDamaged: Record<string, boolean> = {};
  protected readonly totalJars = computed(() => this.jarBalances().reduce((sum, b) => sum + b.outstanding, 0));

  // Full order history for the Orders tab — loaded lazily from the orders API (the same source as the
  // standalone /orders list), scoped to this customer. Rows drill through to /orders/:id.
  private readonly ordersPageSize = 10;
  protected readonly orderRows = signal<OrderListItem[]>([]);
  protected readonly ordersTotal = signal(0);
  protected readonly ordersPage = signal(1);
  protected readonly ordersLoading = signal(false);
  private ordersLoaded = false;
  protected readonly ordersTotalPages = computed(() => Math.max(1, Math.ceil(this.ordersTotal() / this.ordersPageSize)));

  // Return history (every empty-jar return for this customer, per item) — Return inventory movements,
  // loaded lazily from the same endpoint the inventory ledger uses. Drives the "Return history" tab.
  private readonly returnsPageSize = 15;
  protected readonly returnRows = signal<InventoryMovement[]>([]);
  protected readonly returnsTotal = signal(0);
  protected readonly returnsPage = signal(1);
  protected readonly returnsLoading = signal(false);
  private returnsLoaded = false;
  protected readonly returnsTotalPages = computed(() => Math.max(1, Math.ceil(this.returnsTotal() / this.returnsPageSize)));

  // Service requests (repair / maintenance / AMC tickets) for this customer — loaded lazily on the
  // Service tab, newest first. Clicking a row opens the shared service-detail modal in place.
  private readonly servicePageSize = 10;
  protected readonly serviceRows = signal<ServiceRequestListItem[]>([]);
  protected readonly serviceTotal = signal(0);
  protected readonly servicePage = signal(1);
  protected readonly serviceLoading = signal(false);
  private serviceLoaded = false;
  protected readonly serviceTotalPages = computed(() => Math.max(1, Math.ceil(this.serviceTotal() / this.servicePageSize)));
  /** The service request opened in the detail modal, or null when closed. */
  protected readonly serviceDetailId = signal<string | null>(null);

  protected readonly discountTypes: CustomerDiscountType[] = ['None', 'Percentage', 'Fixed'];
  protected discountType: CustomerDiscountType = 'None';
  protected discountValue = 0;

  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'orders', label: 'Order history' },
    { id: 'returns', label: 'Return history' },
    { id: 'payments', label: 'Payment history' },
    { id: 'service', label: 'Service requests' },
  ];

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  constructor() {
    this.load();
    this.service.stats(this.id).subscribe((s) => this.stats.set(s));
    this.loadJarBalance();
    this.loadOpeningBalance();
    this.productsApi.list().subscribe((p) => this.products.set(p));
  }

  private loadOpeningBalance(): void {
    this.service.openingBalance(this.id).subscribe((ob) => this.openingBalance.set(ob));
  }

  /** Opens the opening-balance form, resetting it to empty per-product jar inputs. */
  openOpeningForm(): void {
    this.openingCutover = istToday();
    this.openingJarQty = {};
    this.openingDues = 0;
    this.openingNote = '';
    this.showOpeningForm.set(true);
  }

  /** Seeds the migration opening balance (jars held + dues/advance), then refreshes the page. */
  saveOpeningBalance(): void {
    if (this.savingOpening()) return;
    const jars = this.products()
      .map((p) => ({ productId: p.id, quantity: Math.max(0, Math.floor(Number(this.openingJarQty[p.id]) || 0)) }))
      .filter((j) => j.quantity > 0);

    this.savingOpening.set(true);
    this.service
      .setOpeningBalance(this.id, {
        cutoverDate: this.openingCutover,
        jars,
        openingDues: Number(this.openingDues) || 0,
        note: this.openingNote.trim() || null,
      })
      .subscribe({
        next: () => {
          this.savingOpening.set(false);
          this.showOpeningForm.set(false);
          this.toast.success(this.t.instant('Opening balance set.'));
          this.refreshBalances();
        },
        error: (err) => {
          this.savingOpening.set(false);
          this.toast.apiError(err, this.t.instant('Could not set the opening balance.'));
        },
      });
  }

  clearOpeningBalance(): void {
    if (this.clearingOpening()) return;
    if (!confirm(this.t.instant('Clear this customer’s opening balance? The seeded jars and dues will be removed.'))) return;
    this.clearingOpening.set(true);
    this.service.clearOpeningBalance(this.id).subscribe({
      next: () => {
        this.clearingOpening.set(false);
        this.toast.success(this.t.instant('Opening balance cleared.'));
        this.refreshBalances();
      },
      error: (err) => {
        this.clearingOpening.set(false);
        this.toast.apiError(err, this.t.instant('Could not clear the opening balance.'));
      },
    });
  }

  /** Reloads everything an opening balance affects: customer (money balance), jars, stats, status. */
  private refreshBalances(): void {
    this.load();
    this.loadJarBalance();
    this.loadOpeningBalance();
    this.service.stats(this.id).subscribe((s) => this.stats.set(s));
  }

  /** Toggles the add/edit form; closing it (or the Cancel button) clears any in-progress edit. */
  toggleSubForm(): void {
    if (this.showSubForm()) this.resetSubForm();
    else this.showSubForm.set(true);
  }

  private resetSubForm(): void {
    this.showSubForm.set(false);
    this.editingSubId.set(null);
    this.editingSubProductName = '';
    this.subProductId = '';
    this.subQuantity = 1;
    this.subFrequency = 'Daily';
    this.subRate = null;
  }

  /** Loads an existing subscription into the form for editing (product is fixed). */
  startEditSub(s: CustomerSubscription): void {
    this.editingSubId.set(s.id);
    this.editingSubProductName = s.productName;
    this.subQuantity = s.quantity;
    this.subFrequency = s.frequency;
    this.subRate = s.ratePerUnit;
    this.showSubForm.set(true);
  }

  /**
   * Adds a new subscription or saves edits to an existing one. The nightly job then auto-creates this
   * customer's orders from the active subscriptions.
   */
  saveSubscription(): void {
    if (this.savingSub()) return;
    const editId = this.editingSubId();
    if (!editId && !this.subProductId) {
      this.toast.error(this.t.instant('Please choose a product.'));
      return;
    }
    this.savingSub.set(true);
    const quantity = Math.max(1, Math.floor(this.subQuantity || 1));

    const onError = (msg: string) => {
      this.savingSub.set(false);
      this.toast.error(this.t.instant(msg));
    };
    const onSuccess = (msg: string) => {
      this.savingSub.set(false);
      this.toast.success(this.t.instant(msg));
      this.resetSubForm();
      this.load();
    };

    if (editId) {
      this.service
        .updateSubscription(this.id, editId, { quantity, frequency: this.subFrequency, ratePerUnit: this.subRate })
        .subscribe({
          next: () => onSuccess('Subscription updated.'),
          error: () => onError('Could not update the subscription.'),
        });
      return;
    }

    this.service
      .createSubscription(this.id, { productId: this.subProductId, quantity, frequency: this.subFrequency, ratePerUnit: this.subRate })
      .subscribe({
        next: () => onSuccess('Subscription added.'),
        error: () => onError('Could not add the subscription.'),
      });
  }

  cancelSubscription(subId: string): void {
    this.service.cancelSubscription(this.id, subId).subscribe({
      next: () => {
        this.toast.success(this.t.instant('Subscription ended.'));
        this.load();
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not end the subscription.')),
    });
  }

  private load(): void {
    this.service.get(this.id).subscribe((c) => {
      this.customer.set(c);
      this.discountType = c.discountType ?? 'None';
      this.discountValue = c.discountValue ?? 0;
    });
  }

  private loadJarBalance(): void {
    this.service.jarBalance(this.id).subscribe((b) => {
      this.jarBalances.set(b);
      this.returnQty = Object.fromEntries(b.map((x) => [x.productId, 1]));
      this.returnDamaged = Object.fromEntries(b.map((x) => [x.productId, false]));
    });
  }

  /**
   * Records a jar return for this customer. A good jar is a Return (re-enters reusable float); a
   * damaged jar is a Damage (written off, not re-stocked). Either way the customer's outstanding drops.
   */
  recordReturn(b: CustomerJarBalance): void {
    if (this.returning()) return;
    const qty = Math.min(Math.max(1, Math.floor(this.returnQty[b.productId] || 1)), b.outstanding);
    const damaged = !!this.returnDamaged[b.productId];
    this.returning.set(true);
    this.inventory
      .addMovement({
        productId: b.productId,
        movementType: damaged ? 'Damage' : 'Return',
        quantity: qty,
        customerId: this.id,
        notes: damaged ? this.t.instant('Returned damaged') : null,
      })
      .subscribe({
        next: () => {
          this.returning.set(false);
          this.toast.success(this.t.instant(damaged ? 'Damaged jar return recorded.' : 'Empty jar return recorded.'));
          this.loadJarBalance();
          // Surface the new entry at the top of the return ledger if it's already been opened.
          if (this.returnsLoaded) {
            this.returnsPage.set(1);
            this.loadReturns();
          }
        },
        error: (err) => {
          this.returning.set(false);
          this.toast.apiError(err, this.t.instant('Could not record the return.'));
        },
      });
  }

  /** Switches tab; history lists are fetched on first open of their tab (lazy). */
  selectTab(id: Tab): void {
    this.tab.set(id);
    if (id === 'orders' && !this.ordersLoaded) {
      this.ordersLoaded = true;
      this.loadOrders();
    }
    if (id === 'returns' && !this.returnsLoaded) {
      this.returnsLoaded = true;
      this.loadReturns();
    }
    if (id === 'service' && !this.serviceLoaded) {
      this.serviceLoaded = true;
      this.loadServices();
    }
  }

  /** Loads this customer's service/AMC tickets (newest first). */
  private loadServices(): void {
    this.serviceLoading.set(true);
    this.serviceRequests
      .list({ customerId: this.id, page: this.servicePage(), pageSize: this.servicePageSize })
      .subscribe({
        next: (res) => {
          this.serviceRows.set(res.items);
          this.serviceTotal.set(res.totalCount);
          this.serviceLoading.set(false);
        },
        error: () => this.serviceLoading.set(false),
      });
  }

  servicesGoTo(page: number): void {
    if (page < 1 || page > this.serviceTotalPages() || page === this.servicePage()) return;
    this.servicePage.set(page);
    this.loadServices();
  }

  openService(r: ServiceRequestListItem): void {
    this.serviceDetailId.set(r.id);
  }

  /** After a status/assignment change in the modal, refresh this customer's ticket list. */
  onServiceUpdated(): void {
    this.loadServices();
  }

  serviceStatusClass(status: string): string {
    switch (status) {
      case 'Resolved': return 'status-delivered';
      case 'InProgress': return 'status-in-transit';
      case 'Open': return 'status-pending';
      default: return 'status-active-info';
    }
  }

  servicePriorityClass(priority: string): string {
    switch (priority) {
      case 'Urgent':
      case 'High': return 'status-overdue';
      case 'Medium': return 'status-pending';
      default: return 'status-active-info';
    }
  }

  /** Loads this customer's return ledger (every empty-jar Return, newest first), per item. */
  private loadReturns(): void {
    this.returnsLoading.set(true);
    this.inventory
      .movements({ customerId: this.id, movementType: 'Return,Damage', page: this.returnsPage(), pageSize: this.returnsPageSize })
      .subscribe({
        next: (res) => {
          this.returnRows.set(res.items);
          this.returnsTotal.set(res.totalCount);
          this.returnsLoading.set(false);
        },
        error: () => this.returnsLoading.set(false),
      });
  }

  returnsGoTo(page: number): void {
    if (page < 1 || page > this.returnsTotalPages() || page === this.returnsPage()) return;
    this.returnsPage.set(page);
    this.loadReturns();
  }

  private loadOrders(): void {
    this.ordersLoading.set(true);
    this.orders
      .list({ customerId: this.id, page: this.ordersPage(), pageSize: this.ordersPageSize, sortBy: 'orderDate', sortDir: 'desc' })
      .subscribe({
        next: (res) => {
          this.orderRows.set(res.items);
          this.ordersTotal.set(res.totalCount);
          this.ordersLoading.set(false);
        },
        error: () => this.ordersLoading.set(false),
      });
  }

  ordersGoTo(page: number): void {
    if (page < 1 || page > this.ordersTotalPages() || page === this.ordersPage()) return;
    this.ordersPage.set(page);
    this.loadOrders();
  }

  openOrder(o: OrderListItem): void {
    this.router.navigate(['/orders', o.id]);
  }

  /** Opens the full orders list pre-filtered to this customer. */
  viewAllOrders(): void {
    this.router.navigate(['/orders'], {
      queryParams: { customerId: this.id, customerName: this.customer()?.name },
    });
  }

  /** Starts a new order with this customer already selected. */
  newOrder(): void {
    this.router.navigate(['/orders/new'], { queryParams: { customerId: this.id } });
  }

  /** Refreshes balance + order payment statuses after a payment is recorded. */
  onPaymentSaved(): void {
    this.showPayment.set(false);
    this.load();
    this.service.stats(this.id).subscribe((s) => this.stats.set(s));
    if (this.ordersLoaded) this.loadOrders();
  }

  orderStatusClass(status: string): string {
    switch (status) {
      case 'Delivered': return 'status-delivered';
      case 'Pending':
      case 'Confirmed': return 'status-pending';
      case 'InTransit': return 'status-in-transit';
      default: return 'status-overdue';
    }
  }

  paymentClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-active';
      case 'Partial': return 'status-pending';
      case 'Unpaid': return 'status-overdue';
      case 'Invoiced': return 'text-caption text-ink-mid';
      default: return 'text-micro text-ink-mid';
    }
  }

  asBottle(size: string | null): BottleSize | null {
    return (size as BottleSize) ?? null;
  }

  edit(): void {
    this.router.navigate(['/customers', this.id, 'edit']);
  }

  saveDiscount(): void {
    if (this.savingDiscount()) return;
    this.savingDiscount.set(true);
    const value = this.discountType === 'None' ? 0 : this.discountValue;
    this.service.setDiscount(this.id, this.discountType, value).subscribe({
      next: () => {
        this.savingDiscount.set(false);
        this.toast.success(this.t.instant(this.discountType === 'None' ? 'Discount cleared.' : 'Discount saved.'));
        this.load();
      },
      error: (err) => {
        this.savingDiscount.set(false);
        this.toast.apiError(err, this.t.instant('Could not save the discount.'));
      },
    });
  }

  /** Human-readable summary of the standing discount currently on the customer. */
  discountLabel(c: CustomerDetail): string {
    if (c.discountType === 'Percentage') return this.t.instant('{{value}}% off every invoice', { value: c.discountValue });
    if (c.discountType === 'Fixed') return this.t.instant('₹{{value}} off every invoice', { value: c.discountValue });
    return this.t.instant('No discount');
  }
}
