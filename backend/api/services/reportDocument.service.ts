import type {ResolvedRange} from '../utils/dateRange';
import {formatRangeLabel} from '../utils/dateRange';
import {ReportCounterModel, ReportExportModel} from '../models/ReportExport.model';
import type {ReportBlock, ReportDocument, TableColumn} from './reportPdf.service';
import {
  fetchSales,
  formatManilaDate,
  getCustomerData,
  getOrderData,
  getProductData,
  getSalesData
} from './reportData.service';

/*
 * Builds the five exported reports (one per Reports tab) as print documents.
 * Data comes from reportData.service; layout from reportPdf.service.
 */

export type ReportView = 'overview' | 'sales' | 'operations' | 'products' | 'customers';

export const REPORT_META: Record<ReportView, {prefix: string; title: string}> = {
  overview: {prefix: 'ES', title: 'Executive Summary'},
  sales: {prefix: 'SR', title: 'Sales Report'},
  products: {prefix: 'PS', title: 'Product Sales & Inventory Report'},
  operations: {prefix: 'OS', title: 'Order Summary Report'},
  customers: {prefix: 'CR', title: 'Customer Report'}
};

const SALES_BASIS =
  'Sales are counted when an order is COMPLETED (PFRS 15), by order date, in Philippine time. Walk-in orders must also be marked paid. ' +
  'Cancelled orders are excluded. Payments for orders not yet completed are shown as customer deposits, not sales. ' +
  'Online transaction fees are paid by the customer to Xendit and are not sales.';

// ---------------------------------------------------------------------------
// Formatting (no peso sign: the built-in PDF fonts cannot draw it)
// ---------------------------------------------------------------------------

export function money(value: number) {
  const abs = Math.abs(value).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return value < 0 ? `(${abs})` : abs;
}
const less = (value: number) => (value === 0 ? '0.00' : `(${money(Math.abs(value))})`);
const int = (value: number) => Math.round(value).toLocaleString('en-PH');
const pct = (value: number) => `${value.toFixed(1)}%`;
const minutes = (value: number) => (value > 0 ? `${Math.round(value)} min` : '-');

const cols = (...spec: Array<[string, number, TableColumn['align']?]>): TableColumn[] =>
  spec.map(([label, width, align]) => ({label, width, align: align ?? 'left'}));

const GRANULARITY_LABEL = {day: 'Date', week: 'Week', month: 'Month'} as const;

// ---------------------------------------------------------------------------
// Report numbers
// ---------------------------------------------------------------------------

export async function issueReportNumber(input: {
  view: ReportView;
  range: ResolvedRange;
  admin: {id: string; name: string};
}) {
  const meta = REPORT_META[input.view];
  const year = Number(
    new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Manila', year: 'numeric'}).format(new Date())
  );
  const counter = await ReportCounterModel.findOneAndUpdate(
    {_id: `${meta.prefix}-${year}`},
    {$inc: {seq: 1}},
    {new: true, upsert: true}
  ).lean();
  const sequence = counter?.seq ?? 1;
  const number = `${meta.prefix}-${year}-${String(sequence).padStart(6, '0')}`;

  await ReportExportModel.create({
    number,
    prefix: meta.prefix,
    year,
    sequence,
    view: input.view,
    title: meta.title,
    periodFrom: input.range.from,
    periodTo: input.range.to,
    periodLabel: formatRangeLabel(input.range.from, input.range.to),
    generatedBy: input.admin.id as any,
    generatedByName: input.admin.name
  });
  return number;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

type Sales = Awaited<ReturnType<typeof getSalesData>>;

function salesSummary(s: Sales): ReportBlock {
  const lines: Extract<ReportBlock, {kind: 'statement'}>['lines'] = [
    {label: 'Gross sales (at menu prices)', value: money(s.summary.grossSales)}
  ];
  lines.push({label: 'Less: Discounts and promos', value: less(s.summary.discounts), style: 'less'});
  if (s.summary.otherCharges > 0) {
    lines.push({label: 'Add: Charged above menu price', value: money(s.summary.otherCharges), style: 'less'});
  }
  lines.push({label: 'Net sales', value: money(s.summary.netSales), style: 'subtotal'});
  if (s.summary.deliveryFees > 0) {
    lines.push({label: 'Add: Delivery fees collected', value: money(s.summary.deliveryFees), style: 'less'});
  }
  lines.push({label: 'TOTAL SALES (PHP)', value: money(s.summary.totalSales), style: 'total'});
  lines.push({label: `Completed orders: ${int(s.summary.orders)}   |   Items sold: ${int(s.summary.units)}   |   Average sale per order: ${money(s.summary.avgOrder)}`, style: 'info'});
  return {kind: 'statement', lines};
}

function groupTable(firstLabel: string, rows: Sales['byOrderType'], total: {orders: number; amount: number}): ReportBlock {
  return {
    kind: 'table',
    columns: cols([firstLabel, 0.46], ['Orders', 0.16, 'right'], ['Amount (PHP)', 0.22, 'right'], ['% of sales', 0.16, 'right']),
    rows: rows.map(r => [r.label, int(r.orders), money(r.amount), pct(r.share)]),
    total: ['TOTAL', int(total.orders), money(total.amount), total.orders ? '100.0%' : '0.0%'],
    emptyText: 'No completed sales in this period.'
  };
}

function salesBlocks(s: Sales): ReportBlock[] {
  const total = {orders: s.summary.orders, amount: s.summary.totalSales};
  const blocks: ReportBlock[] = [
    {kind: 'section', title: 'Sales summary'},
    salesSummary(s),
    {kind: 'section', title: 'Sales by order type'},
    groupTable('Order type', s.byOrderType, total),
    {kind: 'section', title: 'Sales by channel'},
    groupTable('Channel', s.bySource, total),
    {kind: 'section', title: 'Sales by payment method'},
    {
      ...(groupTable('Payment method', s.byPayment, total) as Extract<ReportBlock, {kind: 'table'}>),
      note: 'Orders completed before online payments were introduced may not have a payment method on record.'
    },
    {kind: 'section', title: `Sales by ${GRANULARITY_LABEL[s.granularity].toLowerCase()}`},
    {
      kind: 'table',
      columns: cols([GRANULARITY_LABEL[s.granularity], 0.4], ['Orders', 0.18, 'right'], ['Items sold', 0.18, 'right'], ['Amount (PHP)', 0.24, 'right']),
      rows: s.byPeriod.map(p => [p.label, int(p.orders), int(p.units), money(p.amount)]),
      total: ['TOTAL', int(s.summary.orders), int(s.summary.units), money(s.summary.totalSales)],
      emptyText: 'No completed sales in this period.',
      note: `Only ${s.granularity === 'day' ? 'days' : s.granularity === 'week' ? 'weeks (Monday to Sunday)' : 'months'} with completed sales are listed.`
    },
    {kind: 'section', title: 'Not included in sales'},
    {
      kind: 'table',
      columns: cols(['Item', 0.58], ['Orders', 0.16, 'right'], ['Amount (PHP)', 0.26, 'right']),
      rows: [
        ['Customer deposits: paid online, order not yet completed', int(s.deposits.orders), money(s.deposits.amount)],
        ['Open orders: placed, not yet completed (unpaid value)', int(s.openOrders.orders), money(s.openOrders.amount)],
        ['Walk-in orders completed but not marked paid', int(s.unpaidWalkIn.orders), money(s.unpaidWalkIn.amount)],
        ['Cancelled orders', int(s.cancelled.orders), money(s.cancelled.amount)],
        ['Online transaction fees paid by customers to Xendit', '-', money(s.transactionFees)]
      ],
      note: 'These amounts are shown for reconciliation only and are not part of total sales. Open orders include customer deposits.'
    }
  ];
  return blocks;
}

async function productBlocks(range: ResolvedRange): Promise<ReportBlock[]> {
  const sales = await fetchSales(range);
  const [p, s] = await Promise.all([getProductData(range, sales), getSalesData(range)]);

  const rows: string[][] = [];
  const groupRows: number[] = [];
  const subtotalRows: number[] = [];
  for (const cat of p.mixByCategory) {
    groupRows.push(rows.length);
    rows.push([cat.category, '', '', '', '']);
    for (const item of cat.items) {
      rows.push([`   ${item.name}`, int(item.qty), pct(item.qtyShare), money(item.sales), pct(item.salesShare)]);
    }
    subtotalRows.push(rows.length);
    rows.push([`   Subtotal - ${cat.category}`, int(cat.qty), pct(p.totalQty ? (cat.qty / p.totalQty) * 100 : 0), money(cat.sales), pct(p.totalSales ? (cat.sales / p.totalSales) * 100 : 0)]);
  }

  const stockTotal = p.onHand.reduce((a, x) => a + x.stock, 0);
  const valueTotal = p.onHand.reduce((a, x) => a + x.value, 0);
  const mv = p.stockMovements;

  return [
    {kind: 'section', title: 'Product sales (product mix)'},
    {
      kind: 'table',
      columns: cols(['Category / product', 0.4], ['Qty sold', 0.12, 'right'], ['% of qty', 0.12, 'right'], ['Sales (PHP)', 0.2, 'right'], ['% of sales', 0.16, 'right']),
      rows,
      groupRows,
      subtotalRows,
      total: ['GRAND TOTAL', int(p.totalQty), p.totalQty ? '100.0%' : '0.0%', money(p.totalSales), p.totalSales ? '100.0%' : '0.0%'],
      emptyText: 'No products sold in this period.',
      note: `Product sales are at menu price before order discounts. The grand total equals Gross sales in the Sales Report for the same period (${money(s.summary.grossSales)}).`
    },
    {kind: 'section', title: 'Stock on hand'},
    {
      kind: 'table',
      columns: cols(['Product', 0.34], ['Category', 0.22], ['Qty on hand', 0.14, 'right'], ['Unit price (PHP)', 0.14, 'right'], ['Value (PHP)', 0.16, 'right']),
      rows: p.onHand.map(x => [x.available ? x.name : `${x.name} (not on menu)`, x.category, int(x.stock), money(x.price), money(x.value)]),
      total: ['TOTAL', '', int(stockTotal), '', money(valueTotal)],
      note: `Quantities as of ${formatManilaDate(new Date())} (when this report was generated). Stock is valued at selling price because unit cost is not recorded in the system.`
    },
    {kind: 'section', title: 'Stock movements recorded in the period'},
    {
      kind: 'table',
      columns: cols(['Product', 0.4], ['Received', 0.14, 'right'], ['Spoilage', 0.14, 'right'], ['Spoilage value (PHP)', 0.18, 'right'], ['Adjustments', 0.14, 'right']),
      rows: mv.map(m => [m.name, int(m.received), int(m.spoilage), money(m.spoilageValue), m.adjustments > 0 ? `+${int(m.adjustments)}` : int(m.adjustments)]),
      total: mv.length
        ? ['TOTAL', int(mv.reduce((a, m) => a + m.received, 0)), int(mv.reduce((a, m) => a + m.spoilage, 0)), money(mv.reduce((a, m) => a + m.spoilageValue, 0)), int(mv.reduce((a, m) => a + m.adjustments, 0))]
        : undefined,
      emptyText: 'No restocks, spoilage or manual adjustments were recorded in this period.',
      note: 'Manual entries from the Inventory page. Units sold are listed in section 1. Adjustments include stock returned by cancelled orders.'
    },
    {kind: 'section', title: 'Products with no sales (dead stock)'},
    {
      kind: 'table',
      columns: cols(['Product', 0.46], ['Category', 0.24], ['Qty on hand', 0.14, 'right'], ['Value (PHP)', 0.16, 'right']),
      rows: p.deadStock.map(x => [x.name, x.category, int(x.stock), money(x.value)]),
      total: p.deadStock.length
        ? ['TOTAL', '', int(p.deadStock.reduce((a, x) => a + x.stock, 0)), money(p.deadStock.reduce((a, x) => a + x.value, 0))]
        : undefined,
      emptyText: 'Every product in stock sold at least once in this period.'
    }
  ];
}

async function orderBlocks(range: ResolvedRange): Promise<ReportBlock[]> {
  const o = await getOrderData(range);
  const f = o.fulfilment;
  const late = Math.max(0, f.measured - f.onTime);

  return [
    {kind: 'section', title: 'Orders by status'},
    {
      kind: 'table',
      columns: cols(['Status', 0.46], ['Orders', 0.16, 'right'], ['% of orders', 0.16, 'right'], ['Order value (PHP)', 0.22, 'right']),
      rows: o.byStatus.map(r => [r.label, int(r.orders), pct(r.share), money(r.amount)]),
      total: ['TOTAL ORDERS PLACED', int(o.totalPlaced), o.totalPlaced ? '100.0%' : '0.0%', money(o.byStatus.reduce((a, r) => a + r.amount, 0))],
      emptyText: 'No orders were placed in this period.'
    },
    {kind: 'section', title: 'Orders by type'},
    {
      kind: 'table',
      columns: cols(['Order type', 0.4], ['Placed', 0.2, 'right'], ['Completed', 0.2, 'right'], ['Cancelled', 0.2, 'right']),
      rows: o.byType.map(r => [r.label, int(r.placed), int(r.completed), int(r.cancelled)]),
      total: ['TOTAL', int(o.byType.reduce((a, r) => a + r.placed, 0)), int(o.byType.reduce((a, r) => a + r.completed, 0)), int(o.byType.reduce((a, r) => a + r.cancelled, 0))]
    },
    {kind: 'section', title: 'Cancellations by reason'},
    {
      kind: 'table',
      columns: cols(['Reason', 0.6], ['Orders', 0.2, 'right'], ['% of cancelled', 0.2, 'right']),
      rows: o.reasons.map(r => [r.reason, int(r.orders), pct(r.share)]),
      total: o.reasons.length ? ['TOTAL CANCELLED', int(o.cancelledTotal), '100.0%'] : undefined,
      emptyText: 'No orders were cancelled in this period.',
      note: o.totalPlaced ? `Cancellation rate: ${pct((o.cancelledTotal / o.totalPlaced) * 100)} of all orders placed.` : undefined
    },
    {kind: 'section', title: 'Preparation time'},
    {
      kind: 'facts',
      rows: [
        ['Orders with a promised preparation time', int(f.measured)],
        ['Prepared on time', `${int(f.onTime)} (${pct(f.measured ? (f.onTime / f.measured) * 100 : 0)})`],
        ['Prepared late', `${int(late)} (${pct(f.measured ? (late / f.measured) * 100 : 0)})`],
        ['Average promised preparation time', minutes(f.avgPromisedMinutes)],
        ['Average actual preparation time', minutes(f.avgActualMinutes)],
        ['Longest preparation time', minutes(f.worstMinutes)]
      ]
    },
    {kind: 'section', title: 'Completed sales by day of week'},
    {
      kind: 'table',
      columns: cols(['Day', 0.5], ['Orders', 0.22, 'right'], ['Amount (PHP)', 0.28, 'right']),
      rows: o.byWeekday.map(r => [r.label, int(r.orders), money(r.amount)]),
      total: ['TOTAL', int(o.byWeekday.reduce((a, r) => a + r.orders, 0)), money(o.byWeekday.reduce((a, r) => a + r.amount, 0))],
      emptyText: 'No completed sales in this period.'
    },
    {kind: 'section', title: 'Completed sales by hour'},
    {
      kind: 'table',
      columns: cols(['Hour (Philippine time)', 0.5], ['Orders', 0.22, 'right'], ['Amount (PHP)', 0.28, 'right']),
      rows: o.byHour.map(r => [r.label, int(r.orders), money(r.amount)]),
      total: ['TOTAL', int(o.byHour.reduce((a, r) => a + r.orders, 0)), money(o.byHour.reduce((a, r) => a + r.amount, 0))],
      emptyText: 'No completed sales in this period.',
      note: 'Hours with no completed sales are not listed.'
    },
    {kind: 'section', title: 'Open orders needing action'},
    {
      kind: 'table',
      columns: cols(['Order no.', 0.14], ['Date placed', 0.18], ['Type', 0.14], ['Status', 0.24], ['Days open', 0.12, 'right'], ['Amount (PHP)', 0.18, 'right']),
      rows: o.openOrders.map(r => [r.ref, r.placed, r.type, r.status, int(r.daysOpen), money(r.amount)]),
      total: o.openOrders.length
        ? ['TOTAL', `${int(o.openOrders.length)} orders`, '', '', '', money(o.openOrders.reduce((a, r) => a + r.amount, 0))]
        : undefined,
      emptyText: 'All orders placed in this period are completed or cancelled.',
      note: 'Orders placed in this period that are not yet completed or cancelled, oldest first. They are not counted as sales.'
    }
  ];
}

async function customerBlocks(range: ResolvedRange): Promise<ReportBlock[]> {
  const c = await getCustomerData(range);
  return [
    {kind: 'section', title: 'Customer summary'},
    {
      kind: 'facts',
      rows: [
        ['Registered customers who bought in this period', int(c.buyers)],
        ['   New buyers (first completed order in this period)', int(c.newBuyers)],
        ['   Returning buyers', int(c.returningBuyers)],
        ['New customer accounts created in this period', int(c.newAccounts)],
        ['Completed orders (registered + guest)', int(c.totalOrders)]
      ]
    },
    {kind: 'section', title: 'Sales by customer type'},
    {
      kind: 'table',
      columns: cols(['Customer type', 0.46], ['Orders', 0.16, 'right'], ['Amount (PHP)', 0.22, 'right'], ['% of sales', 0.16, 'right']),
      rows: c.split.map(r => [r.label, int(r.orders), money(r.amount), pct(r.share)]),
      total: ['TOTAL', int(c.totalOrders), money(c.totalSales), c.totalOrders ? '100.0%' : '0.0%'],
      note: 'The total equals Total sales in the Sales Report for the same period.'
    },
    {kind: 'section', title: c.topCount > 20 ? 'Top 20 customers by amount spent' : 'Customers by amount spent'},
    {
      kind: 'table',
      columns: cols(['#', 0.06, 'right'], ['Customer', 0.36], ['Orders', 0.12, 'right'], ['Amount (PHP)', 0.18, 'right'], ['% of sales', 0.12, 'right'], ['Last order', 0.16]),
      rows: c.top.map((r, i) => [String(i + 1), r.name, int(r.orders), money(r.amount), pct(r.share), r.last]),
      emptyText: 'No registered customers completed an order in this period.',
      note: 'Registered customers only; guest orders have no customer account. Contact details are not printed, in line with the Data Privacy Act of 2012.'
    }
  ];
}

async function executiveBlocks(range: ResolvedRange): Promise<ReportBlock[]> {
  const sales = await fetchSales(range);
  const [s, p, o, c] = await Promise.all([
    getSalesData(range),
    getProductData(range, sales),
    getOrderData(range, sales),
    getCustomerData(range, sales)
  ]);
  const topItems = p.mixByCategory
    .flatMap(cat => cat.items)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const completedSale = o.byStatus.find(r => r.key === 'completed_sale')?.orders ?? 0;
  const completedUnpaid = o.byStatus.find(r => r.key === 'completed_unpaid')?.orders ?? 0;
  const ofPlaced = (n: number) => pct(o.totalPlaced ? (n / o.totalPlaced) * 100 : 0);
  const outOfStock = p.onHand.filter(x => x.stock <= 0).length;

  return [
    {kind: 'section', title: 'Sales'},
    salesSummary(s),
    {kind: 'section', title: 'Orders'},
    {
      kind: 'facts',
      rows: [
        ['Orders placed', int(o.totalPlaced)],
        ['Completed (counted as sales)', `${int(completedSale)} (${ofPlaced(completedSale)})`],
        ...(completedUnpaid > 0
          ? ([['Completed walk-in, not marked paid', `${int(completedUnpaid)} (${ofPlaced(completedUnpaid)})`]] as Array<[string, string]>)
          : []),
        ['Cancelled', `${int(o.cancelledTotal)} (${pct(o.totalPlaced ? (o.cancelledTotal / o.totalPlaced) * 100 : 0)})`],
        ['Still open', `${int(o.openOrders.length)} orders, ${money(o.openOrders.reduce((a, r) => a + r.amount, 0))} PHP`],
        ['Prepared on time', o.fulfilment.measured ? pct((o.fulfilment.onTime / o.fulfilment.measured) * 100) : '-']
      ]
    },
    {kind: 'section', title: 'Top 5 products by quantity sold'},
    {
      kind: 'table',
      columns: cols(['#', 0.06, 'right'], ['Product', 0.5], ['Qty sold', 0.18, 'right'], ['Sales (PHP)', 0.26, 'right']),
      rows: topItems.map((x, i) => [String(i + 1), x.name, int(x.qty), money(x.sales)]),
      emptyText: 'No products sold in this period.'
    },
    {kind: 'section', title: 'Customers and inventory'},
    {
      kind: 'facts',
      rows: [
        ['Registered customers who bought', `${int(c.buyers)} (${int(c.newBuyers)} new, ${int(c.returningBuyers)} returning)`],
        ['Guest orders', int(c.split[1]?.orders ?? 0)],
        ['Products out of stock now', int(outOfStock)],
        ['Products in stock with no sales this period', int(p.deadStock.length)],
        ['Stock on hand value (at selling price)', `${money(p.onHand.reduce((a, x) => a + x.value, 0))} PHP`]
      ]
    },
    {kind: 'note', text: 'Details: Sales Report (SR), Product Sales & Inventory Report (PS), Order Summary Report (OS) and Customer Report (CR) for the same period.'}
  ];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function buildReportDocument(input: {
  view: ReportView;
  range: ResolvedRange;
  number: string;
  preparedBy: {name: string; role: string};
  business: ReportDocument['business'];
}): Promise<ReportDocument> {
  const {view, range} = input;
  let blocks: ReportBlock[];
  if (view === 'sales') blocks = salesBlocks(await getSalesData(range));
  else if (view === 'products') blocks = await productBlocks(range);
  else if (view === 'operations') blocks = await orderBlocks(range);
  else if (view === 'customers') blocks = await customerBlocks(range);
  else blocks = await executiveBlocks(range);

  return {
    title: REPORT_META[view].title,
    number: input.number,
    // A one-day report reads "Nov 7, 2026", not "Nov 7 – Nov 7, 2026".
    periodLabel: range.days <= 1 ? formatManilaDate(range.from) : formatRangeLabel(range.from, range.to),
    generatedAt: new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }),
    preparedBy: input.preparedBy,
    basis: SALES_BASIS,
    business: input.business,
    blocks
  };
}
