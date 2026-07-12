import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { Plan, SubscriptionService } from '../../../core/services/subscription.service';
import { TokenService } from '../../../core/services/token.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { MobileInputComponent } from '../../../shared/components/mobile-input/mobile-input.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, DecimalPipe, LogoComponent, GoogleSigninButtonModule, MobileInputComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly subscription = inject(SubscriptionService);
  private readonly token = inject(TokenService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly social = inject(SocialAuthService);

  protected readonly step = signal(1);
  protected readonly loading = signal(false);

  /** Set once the user chooses "Continue with Google" — switches the credentials step to passwordless. */
  protected readonly googleProfile = signal<{ idToken: string; name: string; email: string } | null>(null);

  /** Set after a successful sign-up to show the "your portal is ready" screen. */
  protected readonly success = signal<{ url: string; email: string } | null>(null);

  /** Live availability of the typed subdomain. */
  protected readonly subdomainStatus = signal<'idle' | 'checking' | 'available' | 'taken'>('idle');

  /** The live plan catalogue from GET /api/plans (anonymous) — never hardcode prices or limits here. */
  protected readonly plans = signal<Plan[]>([]);
  protected readonly plansStatus = signal<'loading' | 'ready' | 'error'>('loading');

  protected readonly form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    subdomain: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,30}$/)]],
    planType: ['Pro', Validators.required],
    ownerName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^\+91[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  next(): void {
    const step1 = ['businessName', 'subdomain'];
    if (this.step() === 1) {
      if (step1.some((c) => this.form.get(c)!.invalid)) {
        step1.forEach((c) => this.form.get(c)!.markAsTouched());
        return;
      }
      if (this.subdomainStatus() === 'taken') {
        this.toast.error(this.t.instant('That workspace address is already taken. Please choose another.'));
        return;
      }
    }
    this.step.update((s) => Math.min(3, s + 1));
  }

  back(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  selectPlan(type: string): void {
    this.form.controls.planType.setValue(type);
  }

  loadPlans(): void {
    this.plansStatus.set('loading');
    this.subscription.plans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.plansStatus.set('ready');
        // The form defaults to Pro; fall back to the cheapest active plan if Pro was deactivated.
        if (plans.length && !plans.some((p) => p.planType === this.form.controls.planType.value)) {
          this.form.controls.planType.setValue(plans[0].planType);
        }
      },
      error: () => this.plansStatus.set('error'),
    });
  }

  constructor() {
    this.loadPlans();

    // GIS (@abacritt v2) signs in via the <asl-google-signin-button>; capture the profile here so the
    // wizard can finish passwordless. The owner's email is taken authoritatively from the token server-side.
    this.social.authState.pipe(takeUntilDestroyed()).subscribe((user) => {
      if (user?.idToken) {
        this.googleProfile.set({ idToken: user.idToken, name: user.name ?? '', email: user.email ?? '' });
      }
    });

    // Live "is this subdomain free?" check as the user types (debounced).
    this.form.controls.subdomain.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        const v = (value || '').trim();
        if (v.length < 3) {
          this.subdomainStatus.set('idle');
          return;
        }
        this.subdomainStatus.set('checking');
        this.auth.checkSubdomain(v).subscribe({
          next: (r) => this.subdomainStatus.set(r.available ? 'available' : 'taken'),
          error: () => this.subdomainStatus.set('idle'),
        });
      });
  }

  clearGoogle(): void {
    this.googleProfile.set(null);
  }

  submit(): void {
    if (this.googleProfile()) {
      this.submitGoogle();
      return;
    }
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const email = this.form.controls.email.value;
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.onRegistered(email),
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  /** Passwordless signup: owner identity comes from the Google token; only business/plan/mobile here. */
  private submitGoogle(): void {
    const g = this.googleProfile();
    if (!g || this.loading()) return;
    // Steps 1/2 already validated business name, subdomain and plan; mobile is optional for Google.
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.auth
      .registerWithGoogle({
        idToken: g.idToken,
        businessName: v.businessName,
        mobile: v.mobile || undefined,
        planType: v.planType,
        subdomain: v.subdomain || undefined,
      })
      .subscribe({
        next: () => this.onRegistered(g.email),
        error: (err: HttpErrorResponse) => this.onError(err),
      });
  }

  private onRegistered(email: string): void {
    this.loading.set(false);
    // Use the subdomain the server actually assigned (slugified) from the JWT.
    const sub = this.token.decode<{ tenant_sub?: string }>()?.tenant_sub ?? this.form.controls.subdomain.value;
    const url = environment.tenantUrlFormat.replace('{subdomain}', sub);
    this.success.set({ url, email });
  }

  private onError(err: HttpErrorResponse): void {
    this.loading.set(false);

    // Field-level validation errors (subdomain taken / email already owns a workspace): show the
    // server's specific message and jump back to the step that owns the field so the user can fix it.
    const errors = err.error?.errors as Record<string, string[]> | undefined;
    if (errors) {
      const field = Object.keys(errors)[0];
      const message = errors[field]?.[0] ?? this.t.instant('Please check the form for errors.');
      if (field === 'subdomain') {
        this.subdomainStatus.set('taken');
        this.step.set(1);
      } else if (field === 'email') {
        this.step.set(3);
      }
      this.toast.error(message);
      return;
    }

    const key = err.status === 409
      ? 'That business name or email is already taken.'
      : 'Could not create your account. Please try again.';
    this.toast.error(this.t.instant(key));
  }

  copyUrl(): void {
    const s = this.success();
    if (s) navigator.clipboard?.writeText(s.url).then(() => this.toast.success(this.t.instant('Link copied.')));
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
