import {resolveRange} from '../api/utils/dateRange';
import {getReportSummary, getReportOperations, getReportTimeseries, getReportBreakdown} from '../api/services/report.service';
import {connectDb} from '../api/config/db';

const peso = (n: number) => n.toLocaleString('en-PH', {maximumFractionDigits: 0});

async function main() {
  await connectDb();
  const range = resolveRange({preset: '30d'} as never);

  const s = await getReportSummary(range);
  console.log('=== SUMMARY (30d) ===');
  for (const k of s.kpis) {
    const val = k.format === 'peso' ? peso(k.value) : k.format === 'percent' ? `${k.value}%` : k.value;
    console.log(`  ${k.label.padEnd(20)} ${String(val).padStart(9)}  ${k.hint ?? ''}`);
  }
  console.log('\n=== valueSplit ===');
  console.log(' ', JSON.stringify(s.valueSplit, null, 2).replace(/\n/g, '\n  '));
  const v = s.valueSplit;
  console.log(`\n  RECONCILE: collected ${peso(v.collected)} + open ${peso(v.open)} = ${peso(v.collected + v.open)}`);
  console.log(`  order value from non-cancelled = collected + open + (already inside open)`);
  console.log(`  stale ${peso(v.stale)} is a SUBSET of open: ${v.stale <= v.open ? 'OK' : 'BROKEN'}`);

  const ts = await getReportTimeseries(range);
  const tRev = ts.points.reduce((x, p) => x + p.revenue, 0);
  const tOpen = ts.points.reduce((x, p) => x + p.openRevenue, 0);
  console.log(`\n=== TIMESERIES ===`);
  console.log(`  sum(collected)=${peso(tRev)} vs summary collected=${peso(v.collected)} -> ${Math.abs(tRev - v.collected) < 1 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  sum(open)=${peso(tOpen)} vs summary open=${peso(v.open)} -> ${Math.abs(tOpen - v.open) < 1 ? 'MATCH' : 'MISMATCH'}`);

  const ops = await getReportOperations(range);
  console.log(`\n=== OPERATIONS ===`);
  console.log(`  live.open (all-time, never ages out) = ${ops.live.open}`);
  console.log(`  staleOrders: ${ops.staleOrders.count} orders, ${peso(ops.staleOrders.value)}, oldest ${ops.staleOrders.oldestDays}d`);
  const ageSum = ops.staleOrders.byAge.reduce((s, b) => s + b.count, 0);
  const ageVal = ops.staleOrders.byAge.reduce((s, b) => s + b.value, 0);
  console.log('  by age:');
  for (const b of ops.staleOrders.byAge) console.log(`    ${b.label.padEnd(12)} ${String(b.count).padStart(3)}  ${peso(b.value).padStart(7)}`);
  console.log(`  byAge sums to ${ageSum} / ${peso(ageVal)} vs totals ${ops.staleOrders.count} / ${peso(ops.staleOrders.value)} -> ${ageSum === ops.staleOrders.count && Math.abs(ageVal - ops.staleOrders.value) < 1 ? 'MATCH' : 'MISMATCH'}`);
  console.log('  by type:');
  for (const b of ops.staleOrders.byType) console.log(`    ${b.label.padEnd(12)} ${String(b.count).padStart(3)}  ${peso(b.value).padStart(7)}`);
  const typeSum = ops.staleOrders.byType.reduce((s, b) => s + b.count, 0);
  console.log(`  byType sums to ${typeSum} -> ${typeSum === ops.staleOrders.count ? 'MATCH' : 'MISMATCH'}`);

  const bd = await getReportBreakdown(range, 'product');
  console.log(`\n=== BREAKDOWN product ===`);
  console.log(`  total revenue ${peso(bd.total.revenue)} vs collected ${peso(v.collected)} -> ${Math.abs(bd.total.revenue - v.collected) < 1 ? 'MATCH' : 'MISMATCH'}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
