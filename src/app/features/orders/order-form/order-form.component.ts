import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { OrderService } from '../order.service';
import { CreateOrder } from '../order.models';
import { CustomerService } from '../../customers/customer.service';
import { CustomerListItem } from '../../customers/customer.models';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, TranslatePipe, MobilePipe],
  templateUrl: './order-form.component.html',
})
export class OrderFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly orders = inject(OrderService);
  private readonly customers = inject(CustomerService);
  private readonly productsApi = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly nav = inject(NavigationService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly products = signal<Product[]>([]);
  protected readonly customerResults = signal<CustomerListItem[]>([]);
  // id/name/mobile + deliveryMode (drives the Home/Pickup toggle for "Both" customers).
  protected readonly selectedCustomer =
    signal<{ id: string; name: string; mobile: string | null; deliveryMode?: string } | null>(null);
  protected readonly saving = signal(false);
  /** Briefly true to shake the form when a save is blocked by validation (item 14). */
  protected readonly shake = signal(false);

  /** Set when editing an existing (Pending/Confirmed) order rather than creating a new one. */
  protected readonly editId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = computed(() => !!this.editId());

  /** Per-order fulfilment choice, shown only for "Both" customers on a new order. */
  protected readonly orderDeliveryMode = signal<'HomeDelivery' | 'PlantPickup'>('HomeDelivery');
  protected readonly showModeToggle = computed(() => this.selectedCustomer()?.deliveryMode === 'Both');

  // When editing, the rate each product was originally placed at — so the form charges (and shows) the
  // frozen price rather than the current catalogue price. Mirrors the backend's freeze-on-edit.
  private readonly frozenRates = signal<Map<string, number>>(new Map());

  protected readonly customerSearch = this.fb.nonNullable.control('');
  protected readonly form = this.fb.nonNullable.group({
    items: this.fb.array([this.newItem()]),
    notes: [''],
  });

  // Recomputed on every form change so the total stays live.
  private readonly itemsValue = signal(this.form.controls.items.getRawValue());
  protected readonly total = computed(() =>
    this.itemsValue().reduce((sum, it) => sum + this.lineRate(it.productId) * (it.quantity || 0), 0),
  );

  get items(): FormArray {
    return this.form.controls.items;
  }

  constructor() {
    const editId = this.editId();
    if (editId) {
      // Load products FIRST, then populate the order's lines. The item <select> options come from
      // products(); if we set each line's productId before those options exist, the native select can't
      // match the value and shows blank — leaving the form invalid and the update silently blocked.
      this.productsApi.list().subscribe((p) => {
        this.products.set(p);
        this.loadForEdit(editId);
      });
    } else {
      this.productsApi.list().subscribe((p) => this.products.set(p));
      // Pre-select the customer when started from a customer page ("New order").
      const customerId = this.route.snapshot.queryParamMap.get('customerId');
      if (customerId) {
        this.customers.get(customerId).subscribe((c) => {
          this.selectedCustomer.set({ id: c.id, name: c.name, mobile: c.mobile, deliveryMode: c.deliveryMode });
          this.customerSearch.setValue(c.name, { emitEvent: false });
        });
      }
    }

    this.customerSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) =>
          term.trim() ? this.customers.list({ search: term, page: 1, pageSize: 8 }) : Promise.resolve({ items: [] } as never),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => this.customerResults.set(res.items));

    this.form.controls.items.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.itemsValue.set(this.form.controls.items.getRawValue()));
  }

  /** Loads an existing order into the form for editing; only Pending/Confirmed orders are editable. */
  private loadForEdit(id: string): void {
    this.orders.get(id).subscribe((o) => {
      if (o.status !== 'Pending' && o.status !== 'Confirmed') {
        this.toast.error(this.t.instant('This order can no longer be edited.'));
        this.router.navigate(['/orders', id]);
        return;
      }
      this.selectedCustomer.set({ id: o.customerId, name: o.customerName, mobile: o.customerMobile });
      this.customerSearch.setValue(o.customerName, { emitEvent: false });
      // Seed the fulfilment toggle from the order's current mode; fetch the customer to know if they're "Both".
      this.orderDeliveryMode.set(o.deliveryMode === 'PlantPickup' ? 'PlantPickup' : 'HomeDelivery');
      this.customers.get(o.customerId).subscribe((cust) =>
        this.selectedCustomer.update((s) => (s ? { ...s, deliveryMode: cust.deliveryMode } : s)),
      );
      // Freeze each existing line at the rate it was originally placed at.
      this.frozenRates.set(new Map(o.items.map((it) => [it.productId, it.unitRate])));
      this.items.clear();
      for (const it of o.items) {
        const g = this.newItem();
        g.patchValue({ quantity: it.quantity }); // number input binds immediately
        this.items.push(g);
      }
      this.form.controls.notes.setValue(o.notes ?? '');
      // Assign each line's productId only AFTER its <option>s have rendered. A native <select> can't
      // select a value whose <option> doesn't exist yet, so setting it in the same tick the rows are
      // created leaves the dropdown blank (and the line invalid, blocking save). Deferring one tick lets
      // the product options paint first, then the select binds correctly.
      setTimeout(() => {
        o.items.forEach((it, i) => this.items.at(i)?.patchValue({ productId: it.productId }));
        this.itemsValue.set(this.form.controls.items.getRawValue());
      });
    });
  }

  private newItem() {
    return this.fb.nonNullable.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  addItem(): void {
    this.items.push(this.newItem());
  }

  removeItem(i: number): void {
    if (this.items.length > 1) this.items.removeAt(i);
  }

  selectCustomer(c: CustomerListItem): void {
    this.selectedCustomer.set({ id: c.id, name: c.name, mobile: c.mobile, deliveryMode: c.deliveryMode });
    this.customerResults.set([]);
    this.customerSearch.setValue(c.name, { emitEvent: false });
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerSearch.setValue('');
  }

  /** Current catalogue price of a product (shown in the product dropdown). */
  rateFor(productId: string): number {
    return this.products().find((p) => p.id === productId)?.defaultRate ?? 0;
  }

  /**
   * Price actually charged for a line: the frozen original rate when editing a product that was already
   * on the order, otherwise the current catalogue price. Mirrors the backend's freeze-on-edit so the
   * displayed total matches what gets saved.
   */
  lineRate(productId: string): number {
    return this.frozenRates().get(productId) ?? this.rateFor(productId);
  }

  save(): void {
    const customer = this.selectedCustomer();
    if (!customer) {
      this.toast.error(this.t.instant('Please select a customer.'));
      return;
    }
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.toast.error(this.t.instant('Please choose a product and quantity for every line.'));
        this.shake.set(true);
        setTimeout(() => this.shake.set(false), 400);
      }
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const items = v.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const notes = v.notes || null;

    const deliveryMode = this.showModeToggle() ? this.orderDeliveryMode() : null;
    const editId = this.editId();
    if (editId) {
      this.orders.update(editId, { notes, items, deliveryMode }).subscribe({
        next: () => {
          this.toast.success(this.t.instant('Order updated.'));
          this.router.navigate(['/orders', editId]);
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.t.instant('Could not update the order.'));
        },
      });
      return;
    }

    const body: CreateOrder = { customerId: customer.id, notes, items, deliveryMode };
    this.orders.create(body).subscribe({
      next: () => {
        this.toast.success(this.t.instant('Order created.'));
        this.router.navigate(['/deliveries']);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.t.instant('Could not create the order.'));
      },
    });
  }

  cancel(): void {
    this.nav.back('/orders');
  }
}
