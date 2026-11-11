import {z} from 'zod';

const latLng = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180)
});

export const freeDeliveryDto = z.object({
  enabled: z.boolean(),
  minSubtotal: z
    .number({invalid_type_error: 'Minimum order must be a number'})
    .int('Minimum order must be a whole peso amount')
    .min(0, 'Minimum order cannot be negative')
    .max(1_000_000, 'Minimum order is too large'),
  zone: z
    .array(latLng)
    .min(3, 'The delivery zone needs at least 3 points')
    .max(200, 'The delivery zone has too many points')
});

export type FreeDeliveryDto = z.infer<typeof freeDeliveryDto>;
