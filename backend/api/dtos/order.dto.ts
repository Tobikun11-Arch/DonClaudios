import {z} from 'zod';

export const guestOtpSendDto = z.object({
  phoneNumber: z.string().min(1)
});

export const guestOtpVerifyDto = z.object({
  phoneNumber: z.string().min(1),
  code: z.string().length(6)
});

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/**
 * Filters for `GET /orders/all`. Pagination is optional (the cashier polls this
 * endpoint without params and still expects the full queue); when `page` and
 * `limit` are supplied the server returns a bounded page plus the total count.
 */
export const listAllOrdersQueryDto = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z
    .enum(['pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'completed', 'cancelled'])
    .optional(),
  type: z.enum(['pickup', 'delivery', 'reservation']).optional(),
  preset: z
    .enum(['today', 'yesterday', '7d', '30d', '90d', 'thisMonth', 'lastMonth', 'custom'])
    .optional(),
  from: isoDay.optional(),
  to: isoDay.optional(),
  withCounts: z.string().optional()
});

export type ListAllOrdersQuery = z.infer<typeof listAllOrdersQueryDto>;
export type GuestOtpSendDto = z.infer<typeof guestOtpSendDto>;
export type GuestOtpVerifyDto = z.infer<typeof guestOtpVerifyDto>;