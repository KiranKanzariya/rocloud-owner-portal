import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { InvoiceService } from '../invoice.service';
import { InvoiceFilter, InvoiceListItem } from '../invoice.models';
import { DataTableComponent, ColumnDef } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../../shared/directives/can.directive';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

const STATUSES = ['Draft', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'];

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, DataTableComponent, ColumnCellDirective, CanDirective, TranslatePipe],
  templateUrl: './invoice-list.component.html',
})
export class InvoiceListComponent {
  private readonly service = inject(InvoiceService);
  private readonly http = inject(HttpClient);
  protected readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly statuses = STATUSES;
  protected readonly rows = signal<InvoiceListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);

  protected readonly columns: ColumnDef[] = [
    { key: 'invoiceNumber', header: 'Invoice #' },
    { key: 'customerName', header: 'Customer' },
    { key: 'invoiceDate', header: 'Date' },
    { key: 'totalAmount', header: 'Amount', align: 'right' },
    { key: 'dueDate', header: 'Due' },
    { key: 'balance', header: 'Balance', align: 'right' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '', align: 'right' },
  ];

  protected filter: InvoiceFilter = { page: 1, pageSize: 25 };

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(this.filter).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(status: string): void {
    this.filter = { ...this.filter, status: status || undefined, page: 1 };
    this.load();
  }

  onPage(page: number): void {
    this.filter = { ...this.filter, page };
    this.load();
  }

  open(i: InvoiceListItem): void {
    this.router.navigate(['/invoices', i.id]);
  }

  downloadPdf(i: InvoiceListItem): void {
    this.http.get(this.service.pdfUrl(i.id), { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${i.invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not download the PDF.')),
    });
  }

  send(i: InvoiceListItem): void {
    this.service.send(i.id).subscribe({
      next: (r) => {
        if (r.emailed) {
          this.toast.success(this.t.instant('Invoice {{number}} emailed.', { number: i.invoiceNumber }));
        } else {
          this.toast.show(
            this.t.instant('Invoice {{number}} ready, but the customer has no email — nothing was sent.', { number: i.invoiceNumber }),
            'info',
          );
        }
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not send the invoice.')),
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-delivered';
      case 'Draft':
      case 'Sent':
      case 'PartiallyPaid': return 'status-pending';
      case 'Overdue': return 'status-overdue';
      default: return 'status-active-info';
    }
  }
}
