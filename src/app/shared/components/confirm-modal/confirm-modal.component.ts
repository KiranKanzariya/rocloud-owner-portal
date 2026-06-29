import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** Controlled confirmation modal (guide §20). Parent toggles `open` and handles confirm/cancel. */
@Component({
  selector: 'roc-confirm-modal',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="cancel.emit()">
        <div class="card w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-h3 mb-2">{{ title() | translate }}</h3>
          <p class="text-body text-ink-mid mb-5">{{ message() | translate }}</p>
          <div class="flex justify-end gap-2">
            <button class="btn-secondary" (click)="cancel.emit()">{{ 'Cancel' | translate }}</button>
            <button [class]="danger() ? 'btn-danger' : 'btn-primary'" (click)="confirm.emit()">{{ confirmLabel() | translate }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  readonly open = input(false);
  readonly title = input('Are you sure?');
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly danger = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
