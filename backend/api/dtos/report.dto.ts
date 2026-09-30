import {z} from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Expected YYYY-MM-DD or an ISO timestamp')
  .optional();

export const reportRangeQueryDto = z.object({
  preset: z
    .enum(['today', 'yesterday', '7d', '30d', '90d', 'thisMonth', 'lastMonth', 'custom'])
    .optional(),
  from: isoDate,
  to: isoDate
});

export const reportTimeseriesQueryDto = reportRangeQueryDto.extend({
  granularity: z.enum(['day', 'week', 'month']).optional()
});

export const reportBreakdownQueryDto = reportRangeQueryDto.extend({
  dimension: z.enum([
    'product',
    'category',
    'customer',
    'cashier',
    'paymentMethod',
    'orderType',
    'orderSource'
  ]),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

export const REPORT_VIEWS = ['sales', 'operations', 'products', 'customers', 'overview'] as const;

// A PDF is not a breakdown request: the view decides which tables appear, so
// `dimension` must stay optional here or every export would be rejected.
export const reportPdfQueryDto = reportRangeQueryDto.extend({
  view: z.enum(REPORT_VIEWS).default('sales'),
  dimension: z.enum([
    'product',
    'category',
    'customer',
    'cashier',
    'paymentMethod',
    'orderType',
    'orderSource'
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  groupBy: z
    .enum(['day', 'week', 'month', 'product', 'category', 'customer', 'cashier', 'paymentMethod'])
    .optional()
});
