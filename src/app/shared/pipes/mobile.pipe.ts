import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a stored mobile number for display as "+91 98765 43210". Accepts any stored form
 * ("+919876543210", "919876543210", "9876543210"); non-10-digit values are returned unchanged.
 */
@Pipe({ name: 'mobile', standalone: true })
export class MobilePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const ten = value.replace(/\D/g, '').slice(-10);
    if (ten.length !== 10) return value;
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
}
