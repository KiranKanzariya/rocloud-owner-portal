import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Temporary "coming soon" page for feature routes not yet built. Each feature phase (20+)
 * swaps the route's loadComponent to the real component. Reads its label/icon from route.data.
 */
@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center text-center gap-3 py-24">
      <i class="ti text-4xl text-ink-mid" [class]="'ti-' + icon"></i>
      <h1 class="text-h1">{{ title }}</h1>
      <p class="text-body text-ink-mid max-w-sm">This module is coming soon.</p>
    </div>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = (this.route.snapshot.data['title'] as string) ?? 'Coming soon';
  protected readonly icon = (this.route.snapshot.data['icon'] as string) ?? 'circle-dashed';
}
