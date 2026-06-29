import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

/**
 * Re-plays an entrance animation on the host whenever the bound value changes — e.g. crossfading
 * tab content when the active tab switches (item 8). Also runs on first render.
 * Usage: `<div class="card" [rocAnimateOnChange]="tab()">…</div>`
 */
@Directive({ selector: '[rocAnimateOnChange]', standalone: true })
export class AnimateOnChangeDirective implements OnChanges {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;

  @Input('rocAnimateOnChange') value: unknown;
  @Input() animationClass = 'animate-fade-in';

  ngOnChanges(): void {
    this.el.classList.remove(this.animationClass);
    void this.el.offsetWidth; // reflow to restart the animation
    this.el.classList.add(this.animationClass);
  }
}
