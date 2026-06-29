import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Indian mobile input: a fixed +91 prefix and a strict 10-digit field. Binds to reactive forms via
 * formControlName and writes the combined value (e.g. "+919876543210"), or "" when empty. Existing
 * values in any format are normalised on load (last 10 digits kept).
 */
@Component({
  selector: 'roc-mobile-input',
  standalone: true,
  template: `
    <div class="flex items-stretch rounded-md border border-ink-light overflow-hidden"
         [class.opacity-60]="disabled()">
      <span class="px-2.5 flex items-center bg-shell text-ink-mid text-body border-r border-ink-light select-none">+91</span>
      <input type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10"
             class="flex-1 min-w-0 border-0 py-1.5 px-3 focus:ring-0 disabled:bg-shell"
             [value]="digits()" [disabled]="disabled()" [placeholder]="placeholder()"
             (input)="onInput($event)" (blur)="onTouched()" />
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MobileInputComponent), multi: true },
  ],
})
export class MobileInputComponent implements ControlValueAccessor {
  readonly placeholder = input('9876543210');

  protected readonly digits = signal('');
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const clean = el.value.replace(/\D/g, '').slice(0, 10);
    el.value = clean; // reflect sanitisation immediately (strips letters / extra digits)
    this.digits.set(clean);
    this.onChange(clean.length ? `+91${clean}` : '');
  }

  writeValue(value: string | null): void {
    // Accept any stored form ("+919876543210", "919876543210", "9876543210") → keep the last 10 digits.
    this.digits.set((value ?? '').replace(/\D/g, '').slice(-10));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
