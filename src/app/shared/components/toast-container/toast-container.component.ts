import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'roc-toast-container',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="flex items-center gap-2 px-3.5 py-2 rounded-md shadow-md text-sm font-medium max-w-sm animate-slide-in-right"
          [class.bg-teal-light]="t.type === 'success'"
          [class.text-teal]="t.type === 'success'"
          [class.bg-danger-light]="t.type === 'error'"
          [class.text-danger]="t.type === 'error'"
          [class.bg-foam]="t.type === 'info'"
          [class.text-navy]="t.type === 'info'"
        >
          <i
            class="ti"
            [class.ti-circle-check]="t.type === 'success'"
            [class.ti-alert-circle]="t.type === 'error'"
            [class.ti-info-circle]="t.type === 'info'"
          ></i>
          <span class="flex-1">{{ t.message }}</span>
          <button (click)="toast.dismiss(t.id)" class="opacity-60 hover:opacity-100" aria-label="Dismiss">
            <i class="ti ti-x"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);
}
