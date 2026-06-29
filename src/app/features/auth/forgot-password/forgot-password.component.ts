import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-shell">
      <div class="w-full max-w-sm">
        <div class="flex justify-center mb-6"><roc-logo size="lg" variant="default" /></div>
        <div class="card">
          @if (sent()) {
            <h2 class="text-h2 mb-2">{{ 'Check your email' | translate }}</h2>
            <p class="text-body text-ink-mid mb-4">{{ "If an account exists for that address, we've sent a password reset link." | translate }}</p>
            <a routerLink="/login" class="btn-primary w-full justify-center">{{ 'Back to sign in' | translate }}</a>
          } @else {
            <h2 class="text-h2 mb-1">{{ 'Reset your password' | translate }}</h2>
            <p class="text-body text-ink-mid mb-5">{{ "Enter your email and we'll send a reset link." | translate }}</p>
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
              <input type="email" formControlName="email" class="rounded-md border-ink-light"
                     placeholder="you@business.com" />
              <button type="submit" class="btn-primary w-full justify-center" [disabled]="loading()">
                @if (loading()) { <i class="ti ti-loader-2 animate-spin"></i> {{ 'Sending…' | translate }} } @else { {{ 'Send reset link' | translate }} }
              </button>
              <a routerLink="/login" class="text-caption text-navy-light hover:underline text-center">{{ 'Back to sign in' | translate }}</a>
            </form>
          }
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.controls.email.value).subscribe({
      next: () => this.sent.set(true),
      // The API always returns 200 (no account enumeration); show the same confirmation on error.
      error: () => this.sent.set(true),
    });
  }
}
