import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import {
  GoogleLoginProvider,
  SOCIAL_AUTH_CONFIG,
  SocialAuthServiceConfig,
} from '@abacritt/angularx-social-login';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Angular 22 is zoneless by default (no zone.js); set it explicitly for clarity.
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, tenantInterceptor, csrfInterceptor, errorInterceptor]),
    ),

    // Timestamps are stored and sent by the API as UTC (ISO 8601 with a trailing 'Z'). Render every
    // `| date` in the configured timezone (environment.timeZoneOffset, default IST) regardless of the
    // viewer's browser timezone, so every owner sees the same wall-clock time. Individual pipes can
    // still override the timezone if ever needed.
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: environment.timeZoneOffset } },

    // NOTE: Chart.js (ng2-charts) is provided at the Reports route, not here, so it lazy-loads
    // with that feature chunk instead of bloating the initial bundle (guide §25 bundle budget).

    // Google Sign-In (guide §5). Replace the placeholder client id to enable it.
    // NB: @abacritt v2.6 injects the SOCIAL_AUTH_CONFIG InjectionToken — NOT the string
    // 'SocialAuthServiceConfig' (that mismatch throws NG0201 in the login component).
    {
      provide: SOCIAL_AUTH_CONFIG,
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.googleClientId, { oneTapEnabled: false }),
          },
        ],
        onError: (err) => console.error(err),
      } as SocialAuthServiceConfig,
    },

    // Runtime i18n (en/hi/gu) — translations loaded from /assets/i18n/<lang>.json.
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
      fallbackLang: 'en',
    }),

    // Restore the session from the refresh cookie on a hard page load (guide §18).
    provideAppInitializer(() => inject(AuthService).bootstrap()),
    // Apply the saved / default UI language before the first render.
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
};
