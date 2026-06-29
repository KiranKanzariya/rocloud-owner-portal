import { Component, input } from '@angular/core';

/**
 * Loading skeleton placeholder (guide §25 polish). Renders `rows` shimmering bars.
 * Usage: <roc-skeleton [rows]="3" />
 */
@Component({
  selector: 'roc-skeleton',
  standalone: true,
  template: `
    <div class="flex flex-col gap-3" aria-hidden="true">
      @for (r of bars(); track $index) {
        <div class="h-4 rounded bg-ink-light/40 animate-pulse" [style.width]="r"></div>
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly rows = input(3);
  /** Varied widths so the placeholder reads like text, not a block. */
  private readonly widths = ['100%', '92%', '80%', '88%', '70%'];
  protected bars(): string[] {
    return Array.from({ length: this.rows() }, (_, i) => this.widths[i % this.widths.length]);
  }
}
