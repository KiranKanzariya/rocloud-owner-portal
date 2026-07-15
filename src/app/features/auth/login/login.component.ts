import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { LEGAL } from '../../../core/legal-links';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LogoComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly loading = signal(false);

  protected readonly LEGAL = LEGAL;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /**
   * Google sign-in runs on the central apex domain (the single Google "Authorized origin"), not on
   * the tenant subdomain. Redirect there, carrying this subdomain as a hint so the apex can hand the
   * user straight back to the right workspace.
   */
  goToGoogleSignIn(): void {
    const label = window.location.hostname.split('.')[0];
    const hint = label && label !== 'localhost' ? `?tenant=${encodeURIComponent(label)}` : '';
    window.location.href = `${environment.apexUrl}/google-signin${hint}`;
  }

  login(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) this.toast.error(this.t.instant('Invalid email or password.'));
        else if (err.status === 429) this.toast.error(this.t.instant('Too many attempts. Please try again later.'));
        else this.toast.error(this.t.instant('Sign-in failed. Please try again.'));
      },
    });
  }

}
