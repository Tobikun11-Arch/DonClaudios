import {z} from 'zod';

export const guestOtpSendDto = z.object({
  phoneNumber: z.string().min(1)
});

export const guestOtpVerifyDto = z.object({
  phoneNumber: z.string().min(1),
  code: z.string().length(6)
});

export const guestEmailOtpSendDto = z.object({
  email: z.string().email()
});

export const guestEmailOtpVerifyDto = z.object({
  email: z.string().email(),
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
  withCounts: z.string().optional(),
  // `queue`: with no date range, return only active orders (any age) plus
  // orders from the last few days, instead of the whole order history. Used
  // by the cashier's polled list so its cost stays flat as history grows.
  scope: z.enum(['queue']).optional()
});

/** Body of POST /orders/schedule/quote: the cart the slot picker is for. */
export const scheduleQuoteDto = z.object({
  orderType: z.enum(['pickup', 'delivery', 'reservation']),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(10_000)
      })
    )
    .min(1)
    .max(200)
});

export type ScheduleQuoteDto = z.infer<typeof scheduleQuoteDto>;

export type ListAllOrdersQuery = z.infer<typeof listAllOrdersQueryDto>;
export const courierBookingDto = z.object({
  riderName: z.string().trim().max(80).optional().nullable(),
  plateNumber: z.string().trim().max(20).optional().nullable(),
  trackingLink: z.string().trim().max(500).optional().nullable(),
  eta: z.string().trim().max(40).optional().nullable()
});

export type GuestOtpSendDto = z.infer<typeof guestOtpSendDto>;
export type GuestOtpVerifyDto = z.infer<typeof guestOtpVerifyDto>;