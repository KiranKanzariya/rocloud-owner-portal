import { BottleSize } from '../../core/models/bottle-size';

/** Option lists shared by the customer list filter and the customer form (match the API enums). */
export const CustomerActions = {
  deliveryModes: [
    { value: 'HomeDelivery', label: 'Home' },
    { value: 'PlantPickup', label: 'Plant pickup' },
    { value: 'Both', label: 'Both' },
  ],
  paymentPreferences: [
    { value: 'PerBottle', label: 'Per bottle' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Combined', label: 'Combined' },
  ],
  // 250ml / 500ml / 1L are not offered yet (no products of those sizes) — re-add when launched.
  bottleSizes: ['20L', '18L'] as BottleSize[],
};
