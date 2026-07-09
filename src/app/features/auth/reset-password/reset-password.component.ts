import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-shell">
      <div class="w-full max-w-sm">
        <div class="flex justify-center mb-6"><roc-logo size="lg" variant="default" /></div>
        <div class="card">
          <h2 class="text-h2 mb-1">{{ 'Set a new password' | translate }}</h2>
          <p class="text-body text-ink-mid mb-5">{{ 'Choose a strong password for your account.' | translate }}</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
            <input type="password" formControlName="newPassword" class="rounded-md border-ink-light"
                   [placeholder]="'New password (min 8 chars)' | translate" />
            <button type="submit" class="btn-primary w-full justify-center" [disabled]="loading()">
              @if (loading()) { <i class="ti ti-loader-2 animate-spin"></i> {{ 'Updating…' | translate }} } @else { {{ 'Reset password' | translate }} }
            </button>
            <div class="flex flex-col items-center gap-1">
              <a routerLink="/forgot-password" class="text-caption text-navy-light hover:underline">{{ 'Request a new link' | translate }}</a>
              <a routerLink="/login" class="text-caption text-navy-light hover:underline">{{ 'Back to sign in' | translate }}</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly loading = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    if (!this.token) {
      this.toast.error(this.t.instant('Invalid or missing reset token.'));
      return;
    }
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.form.controls.newPassword.value).subscribe({
      next: () => {
        this.toast.success(this.t.instant('Password reset. Please sign in.'));
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.t.instant('This reset link is invalid or has expired.'));
      },
    });
  }
}
