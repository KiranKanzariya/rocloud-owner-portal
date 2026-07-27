import { Directive, ElementRef, OnDestroy, OnInit, inject, input, output } from '@angular/core';

/** Everything that can take focus inside a dialog, in DOM order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Open modals, counted rather than boolean: a confirm dialog opened on top of a form modal
 * must not unlock the body when only the top one closes.
 */
let openCount = 0;
let restoreOverflow = '';

/**
 * Dialog behaviour for the hand-rolled `fixed inset-0 … bg-black/40` overlays used across the app.
 * Put it on the BACKDROP element; the panel is expected to be its element child.
 *
 *   <div rocModal (dismiss)="close()" class="fixed inset-0 z-50 flex items-center justify-center …">
 *     <div class="card w-full max-w-md max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()"> … </div>
 *   </div>
 *
 * It adds what every one of these overlays was missing: dialog semantics for assistive tech,
 * Escape-to-close, a focus trap, focus restored to whatever opened it, and a body scroll lock
 * (without which the page scrolls behind the dialog on touch).
 */
@Directive({
  selector: '[rocModal]',
  standalone: true,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1',
    '(keydown)': 'onKeydown($event)',
  },
})
export class ModalDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  /** Escape closes by default; set false for a dialog that must be resolved explicitly. */
  readonly closeOnEscape = input(true, { alias: 'rocModalCloseOnEscape' });

  /** Raised on Escape. Wire it to the same handler the backdrop click uses. */
  readonly dismiss = output<void>();

  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;

    if (openCount === 0) {
      restoreOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openCount++;

    // Children render in the same change-detection pass; move focus once that has settled.
    setTimeout(() => {
      const first = this.focusable()[0];
      (first ?? this.host).focus({ preventScroll: true });
    });
  }

  ngOnDestroy(): void {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.body.style.overflow = restoreOverflow;

    // Return focus to the trigger so keyboard users don't land back at the top of the page.
    this.previouslyFocused?.focus?.({ preventScroll: true });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape()) {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss.emit();
      return;
    }
    if (event.key !== 'Tab') return;

    // Focus trap: wrap around the ends instead of tabbing out into the page behind.
    const items = this.focusable();
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === this.host)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusable(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el.getClientRects().length > 0,
    );
  }
}
