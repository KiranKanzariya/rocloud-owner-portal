import { Component, computed, input } from '@angular/core';
import { BottleSize } from '../../../core/models/bottle-size';

/**
 * Brand bottle-size badge (guide §5b): 20L renders navy/foam, 18L renders teal, other sizes
 * render gray (coming-soon products). OnPush is the Angular 22 default — do NOT override it.
 */
@Component({
  selector: 'roc-bottle-badge',
  standalone: true,
  template: `<span [class]="cssClass()">{{ size() }}</span>`,
})
export class BottleBadgeComponent {
  readonly size = input.required<BottleSize>();

  private static readonly Gray =
    'inline-flex items-center px-2 py-0.5 rounded-md bg-ink-light/40 text-ink-mid text-xs font-medium';

  readonly cssClass = computed(() => {
    switch (this.size()) {
      case '20L': return 'bottle-20l';
      case '18L': return 'bottle-18l';
      default: return BottleBadgeComponent.Gray;
    }
  });
}
