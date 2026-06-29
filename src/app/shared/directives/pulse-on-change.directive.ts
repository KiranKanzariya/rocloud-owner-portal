import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

/**
 * Briefly pulses the host element whenever the bound value changes — e.g. a balance or status that
 * just updated (item 11). Skips the initial render so it only fires on real changes.
 * Usage: `<span class="status-..." [rocPulseOnChange]="order.status">…</span>`
 */
@Directive({ selector: '[rocPulseOnChange]', standalone: true })
export class PulseOnChangeDirective implements OnChanges {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;

  @Input('rocPulseOnChange') value: unknown;

  private first = true;

  ngOnChanges(): void {
    if (this.first) {
      this.first = false;
      return;
    }
    this.el.classList.remove('pulse-once');
    void this.el.offsetWidth; // force reflow so the animation restarts
    this.el.classList.add('pulse-once');
  }
}
