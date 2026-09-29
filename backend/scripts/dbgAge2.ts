import {OrderModel} from '../api/models/Order.model';
import {connectDb} from '../api/config/db';

const OPEN = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'];
const BUCKETS = [
  {key: 'week', maxDays: 14 as number | null},
  {key: 'month', maxDays: 30 as number | null},
  {key: 'quarter', maxDays: 90 as number | null},
  {key: 'ancient', maxDays: null as number | null}
];

async function main() {
  await connectDb();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 7 * 86400000);

  const branches = BUCKETS.map(b => ({
    case: {$lt: [{$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}}, b.maxDays ?? Number.MAX_SAFE_INTEGER]},
    then: b.key
  }));
  console.log('branches:', JSON.stringify(branches, null, 1).slice(0, 400));

  const grouped = await OrderModel.aggregate([
    {$match: {orderStatus: {$in: OPEN}, createdAt: {$lt: staleCutoff}}},
    {$project: {orderType: 1, value: '$totalAmount'}},
    {$group: {_id: {$switch: {branches, default: 'ancient'}}, count: {$sum: 1}, value: {$sum: '$value'}}},
    {$sort: {_id: 1}}
  ]);
  console.log('\ngrouped by $switch in $group._id:');
  for (const g of grouped) console.log('  ', g._id, g.count, g.value);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
