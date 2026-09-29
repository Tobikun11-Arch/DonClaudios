/**
 * Shapes returned by the owner reporting API (`/api/report/*`).
 * Mirrors the interfaces exported by `backend/api/services/report.service.ts`.
 */

export type ReportView = 'overview' | 'sales' | 'operations' | 'products' | 'customers';

export type ReportPreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'thisMonth'
  | 'lastMonth';

export type ReportGranularity = 'day' | 'week' | 'month';

export type ReportDimension =
  | 'product'
  | 'category'
  | 'customer'
  | 'cashier'
  | 'paymentMethod'
  | 'orderType'
  | 'orderSource';

export const REPORT_VIEWS: ReadonlyArray<{key: ReportView; label: string}> = [
  {key: 'overview', label: 'Overview'},
  {key: 'sales', label: 'Sales'},
  {key: 'operations', label: 'Operations'},
  {key: 'products', label: 'Products'},
  {key: 'customers', label: 'Customers'}
];

export const REPORT_PRESETS: ReadonlyArray<{key: ReportPreset; label: string}> = [
  {key: 'today', label: 'Today'},
  {key: 'yesterday', label: 'Yesterday'},
  {key: '7d', label: 'Last 7 days'},
  {key: '30d', label: 'Last 30 days'},
  {key: '90d', label: 'Last 90 days'},
  {key: 'thisMonth', label: 'This month'},
  {key: 'lastMonth', label: 'Last month'}
];

export const REPORT_DIMENSION_LABELS: Record<ReportDimension, string> = {
  product: 'Product',
  category: 'Category',
  customer: 'Customer',
  cashier: 'Cashier',
  paymentMethod: 'Payment method',
  orderType: 'Order type',
  orderSource: 'Order source'
};

export type ReportRange = {
  preset: ReportPreset | 'custom';
  /** `YYYY-MM-DD`, inclusive, Manila time. Only set when preset is `custom`. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive, Manila time. Only set when preset is `custom`. */
  to?: string;
};

export type ReportRangeInfo = {
  preset: string;
  label: string;
  days: number;
  granularity: ReportGranularity;
};

export type ReportKpi = {
  key: string;
  label: string;
  value: number;
  /** Percentage change vs the previous window. Null when there is no baseline. */
  delta?: number | null;
  hint?: string;
  format: 'peso' | 'number' | 'percent' | 'minutes';
};

export type ReportSummary = {
  range: ReportRangeInfo;
  comparisonLabel: string;
  kpis: ReportKpi[];
  /**
   * Order value split by whether it was collected. `collected + open` is total
   * ordered value; `stale` is a subset of `open`.
   */
  valueSplit: {
    collected: number;
    collectedOrders: number;
    open: number;
    openOrders: number;
    stale: number;
    staleOrders: number;
    oldestOpenDays: number | null;
    staleAfterDays: number;
  };
  customerMix: {
    unique: number;
    repeat: number;
    newCustomers: number;
    guestOrders: number;
    registeredOrders: number;
    repeatRate: number;
  };
  byOrderType: ReportSliceRow[];
  byOrderSource: ReportSliceRow[];
};

export type ReportSliceRow = {key: string; label: string; orders: number; revenue: number};

export type ReportTimeseriesPoint = {
  bucket: string;
  /** Collected revenue for the bucket. */
  revenue: number;
  orders: number;
  /** Value placed in the bucket that is still unfulfilled. */
  openRevenue: number;
  openOrders: number;
};

export type ReportTimeseries = {
  range: ReportRangeInfo;
  granularity: ReportGranularity;
  points: ReportTimeseriesPoint[];
};

export type ReportBreakdownRow = {
  key: string;
  label: string;
  secondary?: string | null;
  units: number;
  orders: number;
  revenue: number;
  share: number;
};

export type ReportBreakdown = {
  range: ReportRangeInfo;
  dimension: ReportDimension;
  rows: ReportBreakdownRow[];
  total: {units: number; orders: number; revenue: number};
  note?: string;
};

export type ReportOperations = {
  range: ReportRangeInfo;
  statusFunnel: Array<{status: string; count: number}>;
  live: {
    open: number;
    preparing: number;
    deliveriesToday: number;
    pickupsToday: number;
    reservationsOpen: number;
  };
  /** Open orders nobody closed, aged. Measured across all history. */
  staleOrders: {
    afterDays: number;
    count: number;
    value: number;
    oldestDays: number | null;
    byAge: Array<{
      label: string;
      minDays: number;
      maxDays: number | null;
      count: number;
      value: number;
    }>;
    byType: Array<{key: string; label: string; count: number; value: number}>;
  };
  fulfilment: {
    measured: number;
    onTime: number;
    onTimeRate: number;
    avgActualMinutes: number;
    avgPromisedMinutes: number;
    worstMinutes: number;
  };
  cancellations: {
    cancelled: number;
    total: number;
    rate: number;
    reasons: Array<{reason: string; count: number}>;
  };
  byHour: Array<{hour: number; orders: number; revenue: number}>;
  byWeekday: Array<{weekday: number; label: string; orders: number; revenue: number}>;
};

export type ReportInventoryHealth = {
  range: ReportRangeInfo;
  /** Unsold stock valued at menu price. There is no cost data, so not a margin figure. */
  stockValue: number;
  wastage: {
    units: number;
    cost: number;
    byProduct: Array<{key: string; label: string; units: number; cost: number}>;
  };
  deadStock: Array<{key: string; label: string; stock: number; stockValue: number}>;
  slowMovers: Array<{key: string; label: string; units: number; revenue: number; stock: number}>;
  topSellers: Array<{key: string; label: string; units: number; revenue: number; stock: number}>;
};
