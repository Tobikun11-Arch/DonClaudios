import {
  getReportBreakdown,
  getReportInventoryHealth,
  getReportOperations,
  getReportSummary,
  getReportTimeseries
} from './report.service';
import type {
  ReportBreakdownRow,
  ReportDimension,
  ReportKpi
} from './report.service';
import type {ReportGranularity, ResolvedRange} from '../utils/dateRange';

/**
 * View-agnostic model of a report. `reportPdf.service.ts` knows how to draw it
 * and nothing about Mongo; keeping the two apart means the layout can change
 * without touching a single query.
 */
export type PdfKpi = {label: string; value: string; delta?: string | null; hint?: string};

export type PdfColumn = {label: string; align: 'left' | 'right'};

export type PdfSection =
  | {kind: 'kpis'; title?: string; columns?: number; items: PdfKpi[]}
  | {kind: 'table'; title: string; columns: PdfColumn[]; rows: Array<Array<string | number>>; note?: string}
  | {kind: 'pairs'; title: string; items: Array<{label: string; value: string}>};

export interface PdfDocumentModel {
  view: string;
  title: string;
  period: string;
  generatedAt: string;
  businessName: string;
  sections: PdfSection[];
}

export type ReportView = 'overview' | 'sales' | 'operations' | 'products' | 'customers';

export interface BuildReportDocumentInput {
  view: ReportView;
  range: ResolvedRange;
  groupBy?: string;
}

const TIME_GROUPINGS = new Set(['day', 'week', 'month']);

const DIMENSION_LABELS: Record<string, string> = {
  product: 'Product',
  category: 'Category',
  customer: 'Customer',
  cashier: 'Cashier',
  paymentMethod: 'Payment Method',
  orderType: 'Order Type',
  orderSource: 'Order Source'
};

/**
 * The peso sign (U+20B1) does not exist in WinAnsiEncoding, which is what the
 * built-in PDF fonts use, so it renders as a blank box. `PHP` is both safe and
 * what a Philippine business report is expected to say. The web UI uses ₱
 * normally, so this divergence is deliberate and must not be "corrected".
 */
export function formatPeso(value: number): string {
  return `PHP ${formatNumber(value, 2)}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function formatMinutes(value: number): string {
  return `${formatNumber(value)} min`;
}

function formatDelta(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, 1)}%`;
}

function formatKpiValue(kpi: ReportKpi): string {
  switch (kpi.format) {
    case 'peso':
      return formatPeso(kpi.value);
    case 'percent':
      return formatPercent(kpi.value);
    case 'minutes':
      return formatMinutes(kpi.value);
    default:
      return formatNumber(kpi.value);
  }
}

function kpiBlock(title: string, items: PdfKpi[], columns = 4): PdfSection {
  return {kind: 'kpis', title, columns, items};
}

function kpisFrom(title: string, kpis: ReportKpi[], columns = 4): PdfSection {
  return kpiBlock(
    title,
    kpis.map(kpi => ({
      label: kpi.label,
      value: formatKpiValue(kpi),
      delta: formatDelta(kpi.delta),
      hint: kpi.hint
    })),
    columns
  );
}

function breakdownTable(title: string, rows: ReportBreakdownRow[]): PdfSection {
  return {
    kind: 'table',
    title,
    columns: [
      {label: title.replace(/^Top |^Revenue by /, '').replace(/ by .*$/, '') || 'Name', align: 'left'},
      {label: 'Units', align: 'right'},
      {label: 'Orders', align: 'right'},
      {label: 'Revenue', align: 'right'},
      {label: 'Share', align: 'right'}
    ],
    rows: rows.map(row => [
      row.secondary ? `${row.label} (${row.secondary})` : row.label,
      formatNumber(row.units),
      formatNumber(row.orders),
      formatPeso(row.revenue),
      formatPercent(row.share)
    ])
  };
}

async function salesSections(
  range: ResolvedRange,
  groupBy: string | undefined
): Promise<PdfSection[]> {
  const summary = await getReportSummary(range);
  const split = summary.valueSplit;
  const sections: PdfSection[] = [
    kpisFrom(
      `Key figures — ${summary.comparisonLabel}`,
      summary.kpis.filter(kpi => !['cancellationRate', 'staleOrders', 'openValue'].includes(kpi.key))
    ),
    {
      // The three figures must add up on paper, otherwise the owner cannot
      // tell which number to believe.
      kind: 'table',
      title: 'Order value reconciliation',
      columns: [
        {label: 'Bucket', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Value', align: 'right'},
        {label: 'Meaning', align: 'left'}
      ],
      rows: [
        [
          'Collected',
          formatNumber(split.collectedOrders),
          formatPeso(split.collected),
          'Completed and paid for. This is real revenue.'
        ],
        [
          'Still open',
          formatNumber(split.openOrders),
          formatPeso(split.open),
          `Placed but not fulfilled. Includes ${formatNumber(split.staleOrders)} stuck orders.`
        ],
        [
          '  of which stuck',
          formatNumber(split.staleOrders),
          formatPeso(split.stale),
          `Open ${formatNumber(split.staleAfterDays)}+ days` +
            (split.oldestOpenDays !== null ? `, oldest ${formatNumber(split.oldestOpenDays)} days` : '')
        ],
        [
          'Total ordered',
          formatNumber(split.collectedOrders + split.openOrders),
          formatPeso(split.collected + split.open),
          'Collected + still open. Excludes cancelled orders.'
        ]
      ],
      note:
        'Cancelled orders are excluded everywhere. Revenue is reported as collected revenue only, because nothing in the order flow closes an abandoned order automatically.'
    },
    {
      kind: 'pairs',
      title: 'Order mix',
      items: [
        ...summary.byOrderType.map(t => ({
          label: t.label,
          value: `${formatNumber(t.orders)} orders · ${formatPeso(t.revenue)}`
        })),
        ...summary.byOrderSource.map(s => ({
          label: `${s.label} source`,
          value: `${formatNumber(s.orders)} orders · ${formatPeso(s.revenue)}`
        }))
      ]
    }
  ];

  const openValue = summary.kpis.find(kpi => kpi.key === 'openValue');
  const stale = summary.kpis.find(kpi => kpi.key === 'staleOrders');
  const trailing = [openValue, stale].filter((k): k is ReportKpi => Boolean(k));
  if (trailing.length) sections.push(kpisFrom('Unfulfilled', trailing));

  const cancellation = summary.kpis.find(kpi => kpi.key === 'cancellationRate');
  if (cancellation) sections.push(kpisFrom('Cancellations', [cancellation]));

  if (!groupBy || TIME_GROUPINGS.has(groupBy)) {
    const series = await getReportTimeseries(range, groupBy as ReportGranularity | undefined);
    sections.push({
      kind: 'table',
      title: `Revenue by ${groupBy ?? series.granularity}`,
      columns: [
        {label: String(groupBy ?? series.granularity).replace(/^./, c => c.toUpperCase()), align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Collected', align: 'right'},
        {label: 'Still Open', align: 'right'},
        {label: 'Avg Order', align: 'right'}
      ],
      rows: series.points.map(point => [
        point.bucket,
        formatNumber(point.orders),
        formatPeso(point.revenue),
        formatPeso(point.openRevenue),
        formatPeso(point.orders ? point.revenue / point.orders : 0)
      ]),
      note: 'Collected counts completed orders only. Still Open is value placed that day and never fulfilled.'
    });
  } else {
    const breakdown = await getReportBreakdown(
      range,
      groupBy as ReportDimension,
      50
    );
    sections.push(breakdownTable(`Revenue by ${DIMENSION_LABELS[groupBy] ?? groupBy}`, breakdown.rows));
  }

  return sections;
}

async function operationsSections(range: ResolvedRange): Promise<PdfSection[]> {
  const ops = await getReportOperations(range);

  return [
    kpiBlock('Live right now', [
      {label: 'Open Orders', value: formatNumber(ops.live.open)},
      {label: 'Deliveries Today', value: formatNumber(ops.live.deliveriesToday)},
      {label: 'Pickups Today', value: formatNumber(ops.live.pickupsToday)},
      {label: 'Reservations Open', value: formatNumber(ops.live.reservationsOpen)}
    ]),
    kpiBlock('Stuck orders (all time)', [
      {label: 'Stuck Orders', value: formatNumber(ops.staleOrders.count), hint: `Open ${formatNumber(ops.staleOrders.afterDays)}+ days`},
      {label: 'Value at Risk', value: formatPeso(ops.staleOrders.value)},
      {
        label: 'Oldest',
        value: ops.staleOrders.oldestDays !== null ? `${formatNumber(ops.staleOrders.oldestDays)} days` : 'None',
        hint: 'Never completed or cancelled'
      },
      {label: 'In Kitchen Now', value: formatNumber(ops.live.preparing)}
    ]),
    {
      kind: 'table',
      title: 'Stuck orders by age',
      columns: [
        {label: 'Age', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Value', align: 'right'}
      ],
      rows: ops.staleOrders.byAge
        .filter(bucket => bucket.count > 0)
        .map(bucket => [bucket.label, formatNumber(bucket.count), formatPeso(bucket.value)]),
      note: ops.staleOrders.count
        ? 'These orders are included in "Open Orders" above and are never fulfilled unless someone closes them. They are not counted as revenue.'
        : `No open order is older than ${formatNumber(ops.staleOrders.afterDays)} days.`
    },
    {
      kind: 'table',
      title: 'Stuck orders by type',
      columns: [
        {label: 'Order Type', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Value', align: 'right'}
      ],
      rows: ops.staleOrders.byType.map(row => [row.label, formatNumber(row.count), formatPeso(row.value)])
    },
    kpiBlock('Kitchen performance', [
      {label: 'On-Time Rate', value: formatPercent(ops.fulfilment.onTimeRate), hint: `${formatNumber(ops.fulfilment.onTime)} of ${formatNumber(ops.fulfilment.measured)} orders`},
      {label: 'Avg Actual Prep', value: formatMinutes(ops.fulfilment.avgActualMinutes)},
      {label: 'Avg Promised Prep', value: formatMinutes(ops.fulfilment.avgPromisedMinutes)},
      {label: 'Slowest Prep', value: formatMinutes(ops.fulfilment.worstMinutes)}
    ]),
    {
      kind: 'table',
      title: 'Order status breakdown',
      columns: [
        {label: 'Status', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Share', align: 'right'}
      ],
      rows: ops.statusFunnel.map(row => [
        row.status.replace(/_/g, ' '),
        formatNumber(row.count),
        formatPercent(ops.cancellations.total ? (row.count / ops.cancellations.total) * 100 : 0)
      ])
    },
    {
      kind: 'table',
      title: `Cancellation reasons (${formatPercent(ops.cancellations.rate)} of all orders)`,
      columns: [
        {label: 'Reason', align: 'left'},
        {label: 'Count', align: 'right'}
      ],
      rows: ops.cancellations.reasons.length
        ? ops.cancellations.reasons.map(r => [r.reason, formatNumber(r.count)])
        : [['No cancellations in this period', '0']]
    },
    {
      kind: 'table',
      title: 'Orders by hour (Manila time)',
      columns: [
        {label: 'Hour', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Revenue', align: 'right'}
      ],
      rows: ops.byHour
        .filter(hour => hour.orders > 0)
        .map(hour => [
          `${String(hour.hour).padStart(2, '0')}:00`,
          formatNumber(hour.orders),
          formatPeso(hour.revenue)
        ])
    },
    {
      kind: 'table',
      title: 'Orders by day of week',
      columns: [
        {label: 'Day', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Revenue', align: 'right'}
      ],
      rows: ops.byWeekday.map(day => [day.label, formatNumber(day.orders), formatPeso(day.revenue)])
    }
  ];
}

async function productSections(range: ResolvedRange): Promise<PdfSection[]> {
  const health = await getReportInventoryHealth(range);

  return [
    kpiBlock('Inventory value', [
      {label: 'Stock on Hand Value', value: formatPeso(health.stockValue)},
      {label: 'Wastage Cost', value: formatPeso(health.wastage.cost), hint: `${formatNumber(health.wastage.units)} units lost`},
      {label: 'Dead Stock Items', value: formatNumber(health.deadStock.length), hint: 'No sales in period'},
      {label: 'Slow Movers', value: formatNumber(health.slowMovers.length), hint: '3 units or fewer'}
    ]),
    {
      kind: 'table',
      title: 'Top sellers',
      columns: [
        {label: 'Product', align: 'left'},
        {label: 'Units', align: 'right'},
        {label: 'Revenue', align: 'right'},
        {label: 'In Stock', align: 'right'}
      ],
      rows: health.topSellers.map(p => [p.label, formatNumber(p.units), formatPeso(p.revenue), formatNumber(p.stock)])
    },
    {
      kind: 'table',
      title: 'Dead stock — nothing sold in this period',
      columns: [
        {label: 'Product', align: 'left'},
        {label: 'Units Left', align: 'right'},
        {label: 'Tied-Up Value', align: 'right'}
      ],
      rows: health.deadStock.length
        ? health.deadStock.map(p => [p.label, formatNumber(p.stock), formatPeso(p.stockValue)])
        : [['None', '0', formatPeso(0)]],
      note: health.deadStock.length
        ? 'Consider a promo, a bundle, or reducing the next order'
        : 'Every product on the menu sold at least once'
    },
    {
      kind: 'table',
      title: 'Slow movers',
      columns: [
        {label: 'Product', align: 'left'},
        {label: 'Units', align: 'right'},
        {label: 'Revenue', align: 'right'},
        {label: 'In Stock', align: 'right'}
      ],
      rows: health.slowMovers.length
        ? health.slowMovers.map(p => [p.label, formatNumber(p.units), formatPeso(p.revenue), formatNumber(p.stock)])
        : [['None', '0', formatPeso(0), '0']]
    },
    {
      kind: 'table',
      title: 'Wastage and stock adjustments',
      columns: [
        {label: 'Product', align: 'left'},
        {label: 'Units Lost', align: 'right'},
        {label: 'Estimated Cost', align: 'right'}
      ],
      rows: health.wastage.byProduct.length
        ? health.wastage.byProduct.map(p => [p.label, formatNumber(p.units), formatPeso(p.cost)])
        : [['No spoilage recorded', '0', formatPeso(0)]]
    }
  ];
}

async function customerSections(range: ResolvedRange): Promise<PdfSection[]> {
  const [summary, breakdown] = await Promise.all([
    getReportSummary(range),
    getReportBreakdown(range, 'customer', 50)
  ]);

  const customerKpis = summary.kpis.filter(kpi =>
    ['customers', 'orders', 'aov', 'revenue'].includes(kpi.key)
  );
  const mix = summary.customerMix;

  return [
    kpisFrom('Customer performance', customerKpis),
    {
      kind: 'pairs',
      title: 'Repeat vs one-time buyers',
      items: [
        {label: 'Unique customers', value: formatNumber(mix.unique)},
        {label: 'Repeat customers', value: `${formatNumber(mix.repeat)} (${formatPercent(mix.repeatRate)})`},
        {label: 'Newly registered', value: formatNumber(mix.newCustomers)},
        {label: 'Orders by registered customers', value: formatNumber(mix.registeredOrders)},
        {label: 'Guest orders', value: formatNumber(mix.guestOrders)}
      ]
    },
    breakdownTable('Top customers by revenue', breakdown.rows),
    {
      kind: 'table',
      title: 'Revenue by order channel',
      columns: [
        {label: 'Channel', align: 'left'},
        {label: 'Orders', align: 'right'},
        {label: 'Revenue', align: 'right'}
      ],
      rows: [
        ...summary.byOrderType.map(t => [t.label, formatNumber(t.orders), formatPeso(t.revenue)]),
        ...summary.byOrderSource.map(s => [`${s.label} source`, formatNumber(s.orders), formatPeso(s.revenue)])
      ]
    }
  ];
}

export async function buildReportDocument({
  view,
  range,
  groupBy
}: BuildReportDocumentInput): Promise<PdfDocumentModel> {
  const businessName = "Don Claudio's Lechon House";
  const generatedAt = new Date();

  let title = 'Business Report';
  let sections: PdfSection[];

  if (view === 'operations') {
    title = 'Operations Report';
    sections = await operationsSections(range);
  } else if (view === 'products') {
    title = 'Products & Inventory Report';
    sections = await productSections(range);
  } else if (view === 'customers') {
    title = 'Customer Report';
    sections = await customerSections(range);
  } else if (view === 'overview') {
    title = 'Business Overview';
    sections = [...(await salesSections(range, 'day')), ...(await operationsSections(range)).slice(0, 3)];
  } else {
    title = 'Sales Report';
    sections = await salesSections(range, groupBy);
  }

  return {
    view,
    title,
    period: range.label,
    generatedAt: generatedAt.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    businessName,
    sections
  };
}
