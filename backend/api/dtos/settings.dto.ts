import {z} from 'zod';
import {
  REWARDS_EARN_PESOS_MAX,
  REWARDS_EARN_PESOS_MIN,
  REWARDS_EARN_POINTS_MAX,
  REWARDS_EARN_POINTS_MIN
} from '../config/rewards';

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

export const rewardsEarnDto = z.object({
  rewardsEarnPoints: z
    .number({invalid_type_error: 'Points must be a number'})
    .int('Points must be a whole number')
    .min(REWARDS_EARN_POINTS_MIN, `Points must be at least ${REWARDS_EARN_POINTS_MIN}`)
    .max(REWARDS_EARN_POINTS_MAX, `Points cannot be more than ${REWARDS_EARN_POINTS_MAX.toLocaleString('en-PH')}`),
  rewardsEarnPesos: z
    .number({invalid_type_error: 'Peso amount must be a number'})
    .int('Peso amount must be a whole number')
    .min(REWARDS_EARN_PESOS_MIN, `Peso amount must be at least ₱${REWARDS_EARN_PESOS_MIN}`)
    .max(REWARDS_EARN_PESOS_MAX, `Peso amount cannot be more than ₱${REWARDS_EARN_PESOS_MAX.toLocaleString('en-PH')}`)
});

export type RewardsEarnDto = z.infer<typeof rewardsEarnDto>;

// '' clears a color back to the default.
const hexColor = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{6})?$/, 'Colors must be a hex value like #2d4a35');

export const dashboardThemeDto = z.object({
  target: z.enum(['owner', 'cashier', 'customer']),
  sidebarBg: hexColor,
  accent: hexColor
});

export type DashboardThemeDto = z.infer<typeof dashboardThemeDto>;
