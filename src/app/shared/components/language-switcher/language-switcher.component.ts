import { Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';

/** Topbar language picker (en/hi/gu). Switches the UI language live and persists the choice. */
@Component({
  selector: 'roc-language-switcher',
  standalone: true,
  template: `
    <div class="relative">
      <button
        class="flex items-center gap-1.5 p-2 rounded-md hover:bg-shell text-ink-mid"
        (click)="toggle()" aria-label="Change language">
        <i class="ti ti-language text-lg"></i>
        <span class="hidden sm:inline text-body">{{ currentLabel() }}</span>
        <i class="ti ti-chevron-down text-sm"></i>
      </button>
      @if (open()) {
        <div class="absolute right-0 mt-1 w-40 bg-white border border-ink-light rounded-md shadow-md py-1 z-40">
          @for (l of lang.languages; track l.code) {
            <button
              class="w-full flex items-center justify-between gap-2 px-3 py-2 text-body hover:bg-shell"
              [class.text-navy]="l.code === lang.current()"
              [class.font-medium]="l.code === lang.current()"
              (click)="select(l.code)">
              <span>{{ l.label }}</span>
              @if (l.code === lang.current()) { <i class="ti ti-check text-teal-mid"></i> }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class LanguageSwitcherComponent {
  protected readonly lang = inject(LanguageService);
  protected readonly open = signal(false);

  protected readonly currentLabel = computed(
    () => this.lang.languages.find((l) => l.code === this.lang.current())?.label ?? 'English',
  );

  toggle(): void {
    this.open.update((v) => !v);
  }

  select(code: string): void {
    this.lang.use(code);
    this.open.set(false);
  }
}
