import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

/**
 * Animates a number from its previous value up to the new one (item 9), easing out over ~650ms.
 * Use on an inline element: `<span [rocCountUp]="metric()" [currency]="true"></span>`.
 * Honours prefers-reduced-motion by snapping straight to the value.
 */
@Directive({ selector: '[rocCountUp]', standalone: true })
export class CountUpDirective implements OnChanges {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;

  @Input('rocCountUp') value = 0;
  /** Format with Indian thousands separators (for ₹ amounts). */
  @Input() currency = false;

  private current = 0;
  private raf = 0;

  ngOnChanges(): void {
    const target = this.value ?? 0;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.render(target);
      this.current = target;
      return;
    }
    cancelAnimationFrame(this.raf);
    const start = this.current;
    const startTime = performance.now();
    const duration = 650;
    const tick = (now: number): void => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      this.render(start + (target - start) * eased);
      if (p < 1) this.raf = requestAnimationFrame(tick);
      else this.current = target;
    };
    this.raf = requestAnimationFrame(tick);
  }

  private render(v: number): void {
    const n = Math.round(v);
    this.el.textContent = this.currency ? n.toLocaleString('en-IN') : String(n);
  }
}
