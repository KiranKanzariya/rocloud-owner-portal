import { Component, inject } from '@angular/core';
import { NavigationService } from '../../../core/services/navigation.service';

/**
 * Route map placeholder. The live map needs @angular/google-maps + a Maps API key (not yet
 * configured). Wire those in to plot delivery locations colour-coded by status.
 */
@Component({
  selector: 'app-delivery-map',
  standalone: true,
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <button class="p-1.5 rounded hover:bg-shell text-ink-mid" (click)="back()"><i class="ti ti-arrow-left"></i></button>
        <h1 class="text-h1">Route map</h1>
      </div>
      <div class="card flex flex-col items-center justify-center text-center gap-3 py-24">
        <i class="ti ti-map-2 text-4xl text-ink-mid"></i>
        <p class="text-body text-ink-mid max-w-sm">
          The route map requires a Google Maps API key. Configure <code>googleMapsApiKey</code> in the
          environment to plot today's deliveries colour-coded by status.
        </p>
      </div>
    </div>
  `,
})
export class DeliveryMapComponent {
  private readonly nav = inject(NavigationService);

  back(): void {
    this.nav.back('/deliveries');
  }
}
