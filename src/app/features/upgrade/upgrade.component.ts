import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <i class="ti ti-rocket text-4xl text-navy"></i>
      <h1 class="text-h1">Upgrade required</h1>
      <p class="text-body text-ink-mid max-w-sm">
        This feature needs a higher plan. You're currently on <b>{{ perms.plan() }}</b>.
      </p>
      <a routerLink="/settings/subscription" class="btn-primary mt-2">View plans</a>
    </div>
  `,
})
export class UpgradeComponent {
  protected readonly perms = inject(PermissionService);
}
