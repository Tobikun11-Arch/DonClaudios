import {OrderModel} from '../api/models/Order.model';
import {connectDb} from '../api/config/db';
const OPEN = ['pending','confirmed','preparing','ready','on_the_way'];

async function main() {
  await connectDb();
  const staleCutoff = new Date(Date.now() - 7 * 86400000);
  const M = [{$match: {orderStatus: {$in: OPEN}, createdAt: {$lt: staleCutoff}}}];

  const a = await OrderModel.aggregate([...M,
    {$group: {_id: {$floor: {$divide: [{$subtract: ['$$NOW', '$createdAt']}, 86400000]}}, n: {$sum: 1}}},
    {$sort: {_id: 1}}, {$limit: 8}]);
  console.log('A) age via $$NOW inside $group._id:');
  for (const r of a) console.log('   ', r._id, r.n);

  const b = await OrderModel.aggregate([...M,
    {$project: {ag: {$floor: {$divide: [{$subtract: ['$$NOW', '$createdAt']}, 86400000]}}}},
    {$group: {_id: '$ag', n: {$sum: 1}}}, {$sort: {_id: 1}}, {$limit: 8}]);
  console.log('B) age via $project then $group:');
  for (const r of b) console.log('   ', r._id, r.n);

  const c = await OrderModel.aggregate([...M,
    {$group: {_id: {$switch: {branches: [
      {case: {$lt: ['$ag', 14]}, then: 'week'},
      {case: {$lt: ['$ag', 30]}, then: 'month'},
      {case: {$lt: ['$ag', 90]}, then: 'quarter'}
    ], default: 'ancient'}}, n: {$sum: 1}}}]);
  console.log('C) $switch on $ag inside $group:');
  for (const r of c) console.log('   ', r._id, r.n);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
