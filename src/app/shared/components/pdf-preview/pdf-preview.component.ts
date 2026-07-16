import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Reusable PDF preview (guide §22). The PDF endpoint requires a bearer token, so a plain
 * iframe src can't authenticate — we fetch the bytes via HttpClient (the auth interceptor
 * attaches the token), build an object URL, and show it in the browser's native viewer.
 * Also exposes a download. (A heavier PDF.js viewer can replace this later if needed.)
 */
@Component({
  selector: 'roc-pdf-preview',
  standalone: true,
  template: `
    <div class="flex flex-col gap-2">
      @if (!hideDownload()) {
        <div class="flex justify-end gap-2">
          <button class="btn-secondary btn-sm" [disabled]="!ready()" (click)="download()">
            <i class="ti ti-download"></i> Download
          </button>
        </div>
      }
      @if (loading()) {
        <div class="py-24 text-center text-ink-mid"><i class="ti ti-loader-2 animate-spin"></i> Loading PDF…</div>
      } @else if (safeUrl()) {
        <iframe [src]="safeUrl()" class="w-full h-[70vh] rounded-md border border-ink-light" title="Invoice PDF"></iframe>
      } @else {
        <div class="py-24 text-center text-ink-mid">PDF unavailable.</div>
      }
    </div>
  `,
})
export class PdfPreviewComponent {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly fileName = input('document.pdf');
  /** Hide the built-in Download button so a parent can own it (e.g. in the page header). */
  readonly hideDownload = input(false);

  protected readonly loading = signal(false);
  protected readonly safeUrl = signal<SafeResourceUrl | null>(null);
  protected readonly objectUrl = signal<string | null>(null);

  /** True once the PDF is fetched and downloadable — for a parent-owned Download button's disabled state. */
  readonly ready = computed(() => !this.loading() && this.objectUrl() !== null);

  constructor() {
    effect((onCleanup) => {
      const url = this.url();
      this.loading.set(true);
      const sub = this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const objUrl = URL.createObjectURL(blob);
          this.objectUrl.set(objUrl);
          this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objUrl));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      onCleanup(() => {
        sub.unsubscribe();
        const old = this.objectUrl();
        if (old) URL.revokeObjectURL(old);
      });
    });
  }

  download(): void {
    const url = this.objectUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName();
    a.click();
  }
}
