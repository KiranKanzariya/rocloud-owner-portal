import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Inline "feature locked" banner (guide §25). Shown where a feature needs a higher plan.
 * Usage: <roc-upgrade-banner feature="Reports" plan="Pro" />
 */
@Component({
  selector: 'roc-upgrade-banner',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="card flex items-center gap-3 border-l-4 border-amber">
      <i class="ti ti-crown text-amber text-h2"></i>
      <div class="flex-1">
        <p class="text-body font-medium">{{ '{{feature}} is available on the {{plan}} plan.' | translate: { feature: (feature() | translate), plan: plan() } }}</p>
        @if (description()) { <p class="text-caption text-ink-mid">{{ description() | translate }}</p> }
      </div>
      <a routerLink="/settings/subscription" class="btn-primary shrink-0">{{ 'Upgrade now →' | translate }}</a>
    </div>
  `,
})
export class UpgradeBannerComponent {
  readonly feature = input.required<string>();
  readonly plan = input<string>('Pro');
  readonly description = input<string>('');
}
