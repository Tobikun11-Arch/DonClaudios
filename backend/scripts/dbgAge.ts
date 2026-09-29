import {OrderModel} from '../api/models/Order.model';
import {connectDb} from '../api/config/db';

const OPEN = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'];

async function main() {
  await connectDb();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 7 * 86400000);
  const rows = await OrderModel.aggregate([
    {$match: {orderStatus: {$in: OPEN}, createdAt: {$lt: staleCutoff}}},
    {
      $project: {
        createdAt: 1,
        total: '$totalAmount',
        ageDays: {$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}}
      }
    },
    {$limit: 6}
  ]);
  console.log('raw ages:');
  for (const r of rows) console.log('  age=', r.ageDays, ' createdAt=', r.createdAt);

  const sw = await OrderModel.aggregate([
    {$match: {orderStatus: {$in: OPEN}, createdAt: {$lt: staleCutoff}}},
    {
      $project: {
        ageDays: {$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}},
        key: {
          $switch: {
            branches: [
              {case: {$lt: [{$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}}, 14]}, then: 'week'},
              {case: {$lt: [{$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}}, 30]}, then: 'month'},
              {case: {$lt: [{$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}}, 90]}, then: 'quarter'},
              {case: {$lt: [{$floor: {$divide: [{$subtract: [now, '$createdAt']}, 86400000]}}, Number.MAX_SAFE_INTEGER]}, then: 'ancient'}
            ],
            default: 'ancient'
          }
        }
      }
    },
    {$limit: 6}
  ]);
  console.log('switch output:');
  for (const r of sw) console.log('  age=', r.ageDays, ' key=', r.key);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
