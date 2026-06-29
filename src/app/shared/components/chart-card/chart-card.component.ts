import { Component, input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

/**
 * Reusable chart wrapper (guide §23). Wraps a titled card around a ng2-charts canvas so every
 * report chart shares the same framing. Pass `type`, `data`, and optional `options`.
 */
@Component({
  selector: 'roc-chart-card',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="card">
      <h3 class="text-h3 mb-3">{{ title() }}</h3>
      <div class="relative h-64">
        <canvas baseChart [type]="type()" [data]="data()" [options]="options()"></canvas>
      </div>
    </div>
  `,
})
export class ChartCardComponent {
  readonly title = input('');
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartData>();
  readonly options = input<ChartConfiguration['options']>({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' } },
  });
}
