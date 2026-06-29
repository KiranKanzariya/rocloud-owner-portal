import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <i class="ti ti-lock text-4xl text-ink-mid"></i>
      <h1 class="text-h1">Access denied</h1>
      <p class="text-body text-ink-mid max-w-sm">You don't have permission to view this page.</p>
      <a routerLink="/dashboard" class="btn-primary mt-2">Back to dashboard</a>
    </div>
  `,
})
export class ForbiddenComponent {}
