import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Marks a custom cell template for a data-table column:
 *   <ng-template appColumnCell="balance" let-row> … </ng-template>
 * The DataTableComponent looks these up by key and falls back to plain text otherwise.
 */
@Directive({ selector: '[appColumnCell]', standalone: true })
export class ColumnCellDirective {
  @Input({ required: true, alias: 'appColumnCell' }) key!: string;
  readonly tpl = inject(TemplateRef<{ $implicit: unknown }>);
}
