import { Component, computed, input } from '@angular/core';

export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoVariant = 'default' | 'on-dark' | 'wordmark-only' | 'icon-only';

/**
 * The canonical ROCloud brand mark (guide §5b): layered-cloud icon + two-tone "RO"/"Cloud"
 * wordmark. OnPush is the Angular 22 default — do NOT override it.
 */
@Component({
  selector: 'roc-logo',
  standalone: true,
  template: `
    <div class="inline-flex items-center" [style.gap.px]="gap()">
      @if (variant() !== 'wordmark-only') {
        <svg [attr.width]="px()" [attr.height]="px()" viewBox="0 0 44 44" fill="none"
             xmlns="http://www.w3.org/2000/svg" aria-label="ROCloud">
          <rect width="44" height="44" rx="10" [attr.fill]="outerFill()" />
          <rect x="8"  y="26" width="28" height="10" rx="5" fill="#185FA5" />
          <rect x="12" y="22" width="20" height="10" rx="5" fill="#378ADD" />
          <rect x="15" y="18" width="14" height="10" rx="5" fill="#B5D4F4" />
          <circle cx="22" cy="15" r="6" fill="#1D9E75" />
          <path d="M20 15L21.5 16.5L24.5 13" stroke="#E1F5EE" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
      @if (variant() !== 'icon-only') {
        <span class="font-display font-bold leading-none"
              [style.font-size.px]="wordmarkSize()" style="letter-spacing:-0.5px">
          <span [style.color]="roColor()">RO</span><span [style.color]="cloudColor()">Cloud</span>
        </span>
      }
    </div>
  `,
})
export class LogoComponent {
  readonly size = input<LogoSize>('md');
  readonly variant = input<LogoVariant>('default');

  private readonly onDark = computed(() => this.variant() === 'on-dark');

  // size → icon px (20 / 32 / 44)
  readonly px = computed(() => ({ sm: 20, md: 32, lg: 44 }[this.size()]));
  // wordmark scales with size (22px is the canonical lockup at lg)
  readonly wordmarkSize = computed(() => ({ sm: 14, md: 18, lg: 22 }[this.size()]));
  readonly gap = computed(() => Math.round(this.px() / 4));

  readonly outerFill = computed(() => (this.onDark() ? '#185FA5' : '#0C447C'));
  readonly roColor = computed(() => (this.onDark() ? '#B5D4F4' : '#0C447C'));
  readonly cloudColor = computed(() => (this.onDark() ? '#5DCAA5' : '#1D9E75'));
}
