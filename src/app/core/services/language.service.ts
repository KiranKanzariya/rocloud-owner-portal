import { Injectable, Signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export interface AppLanguage {
  code: string;
  label: string;
}

/**
 * UI languages offered by the owner portal. v1 launch = en/hi/gu (guide §4c).
 * To expand later, add a row here and ensure src/assets/i18n/<code>.json is filled
 * (the mr/ta/te/kn/pa/bn files already exist with partial translations as a head start —
 * run `node scripts/translate-i18n.mjs` to top them up). The API already supports all 9 cultures.
 */
export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

const STORAGE_KEY = 'rocloud_lang';
const DEFAULT_LANG = 'en';

/**
 * Thin wrapper over ngx-translate's TranslateService that owns the list of UI languages,
 * persists the user's choice to localStorage, and exposes the current language as a signal.
 * The UI text itself lives in /assets/i18n/<code>.json.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly languages = APP_LANGUAGES;
  /** Reactive current language code (null until init runs). */
  readonly current: Signal<string | null> = this.translate.currentLang;

  /**
   * APP_INITIALIZER: register languages, set the fallback, and apply the saved/default choice.
   * Returns the load promise so Angular waits for the translation file before first paint
   * (avoids a flash of raw keys).
   */
  init(): Promise<unknown> {
    this.translate.addLangs(APP_LANGUAGES.map((l) => l.code));
    this.translate.setFallbackLang(DEFAULT_LANG);
    return firstValueFrom(this.translate.use(this.resolveInitialLang()));
  }

  /** Switch the UI language and remember it for next time. */
  use(code: string): void {
    if (!APP_LANGUAGES.some((l) => l.code === code)) return;
    this.translate.use(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* localStorage unavailable (private mode) — language still applies for this session. */
    }
  }

  /** Saved choice → browser language (if supported) → English. */
  private resolveInitialLang(): string {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (saved && APP_LANGUAGES.some((l) => l.code === saved)) return saved;

    const browser = this.translate.getBrowserLang();
    return browser && APP_LANGUAGES.some((l) => l.code === browser) ? browser : DEFAULT_LANG;
  }
}
