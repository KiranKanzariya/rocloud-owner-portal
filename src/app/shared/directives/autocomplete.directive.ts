import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Keyboard support for the hand-rolled customer autocompletes.
 *
 * All nine of them rendered their results as a plain list of buttons with no key handling,
 * no roles and no active-option state, so they could only be used with a mouse. This adds
 * the standard combobox keys without each component having to track a highlighted index.
 *
 * Put it on the wrapper that holds the input and the popup; mark the popup `.ac-popup`:
 *
 *   <div class="relative" rocAutocomplete>
 *     <input type="search" … />
 *     <ul class="ac-popup absolute …"> <li><button>…</button></li> </ul>
 *   </div>
 *
 * Options are discovered from the DOM on each keystroke, so a component can keep rendering
 * its results however it likes.
 */
@Directive({
  selector: '[rocAutocomplete]',
  standalone: true,
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class AutocompleteDirective {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  /** Index into the current options, or -1 when nothing is highlighted. */
  private active = -1;

  private options(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>('.ac-popup button'));
  }

  private input(): HTMLInputElement | null {
    return this.host.querySelector<HTMLInputElement>('input');
  }

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.options();
    // No open popup means nothing to navigate — stay completely inert so this directive can
    // sit on a plain `relative` wrapper without swallowing keys (notably Escape, which must
    // keep reaching an enclosing dialog).
    if (!options.length) return;

    if (event.key === 'Escape') {
      // Clearing the term is what closes the popup in every one of these components.
      const input = this.input();
      if (input && input.value) {
        event.stopPropagation();   // don't also close the surrounding modal
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      this.setActive(-1, options);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.setActive((this.active + 1) % options.length, options);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.setActive((this.active - 1 + options.length) % options.length, options);
        break;
      case 'Home':
        event.preventDefault();
        this.setActive(0, options);
        break;
      case 'End':
        event.preventDefault();
        this.setActive(options.length - 1, options);
        break;
      case 'Enter':
        // Enter with nothing highlighted takes the first hit — the common case after typing.
        event.preventDefault();
        options[this.active >= 0 ? this.active : 0].click();
        this.active = -1;
        break;
      default:
        // Any other key means the result set is about to change; drop the highlight.
        this.active = -1;
    }
  }

  /** Leaving the widget entirely resets the highlight (moving within it does not). */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.contains(next)) this.active = -1;
  }

  private setActive(index: number, options: HTMLElement[]): void {
    this.active = index;
    options.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle('bg-shell', on);
      el.setAttribute('aria-selected', String(on));
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
    const input = this.input();
    if (input) {
      if (index >= 0) {
        if (!options[index].id) options[index].id = `ac-opt-${Math.abs(index)}-${options.length}`;
        input.setAttribute('aria-activedescendant', options[index].id);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }
  }
}
