import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'roc-toast-container',
  standalone: true,
  template: `
    <!--
      z-[100] (above the z-50 modals) plus aria-live so the message is announced.
      This container sits before <router-outlet> in app.html, so at an equal z-index the
      modal — which comes later in the DOM — painted on top and hid every toast raised
      from inside one, which is exactly where save errors are reported.
      left-4 bounds the width on a phone: right-4 + max-w-sm alone put the left edge
      off-screen at 360px. pointer-events-none on the stack keeps the empty area
      click-through; the toasts themselves re-enable it.
    -->
    <div
      class="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col items-end gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      @for (t of toast.toasts(); track t.id) {
        <div
          class="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-md shadow-md text-body font-medium w-full sm:w-auto sm:max-w-sm animate-slide-in-right"
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
           aria-hidden="true"></i>
          <span class="flex-1">{{ t.message }}</span>
          <button (click)="toast.dismiss(t.id)" class="p-1 -m-1 rounded opacity-60 hover:opacity-100" aria-label="Dismiss">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);
}
