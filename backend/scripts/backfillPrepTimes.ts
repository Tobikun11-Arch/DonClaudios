/**
 * Backfills prepTimeMinutes on products created before the field existed, so
 * no product is ever left without an estimate. Mongoose `default` only applies
 * to new documents, so existing ones need this.
 *
 * Run: npm run seed:prep-times
 */
import {connectDb} from '../api/config/db';
import {ProductModel} from '../api/models/Product.model';
import {AdminModel} from '../api/models/Admin.model';
import {OrderModel} from '../api/models/Order.model';

const FALLBACK_PREP_MINUTES = 20;

async function main() {
  await connectDb();

  const admins = await AdminModel.find({}).exec();
  const defaultPrepMinutes = admins[0]?.defaultPrepMinutes ?? FALLBACK_PREP_MINUTES;

  const productResult = await ProductModel.updateMany(
    {$or: [{prepTimeMinutes: null}, {prepTimeMinutes: {$exists: false}}]},
    {$set: {prepTimeMinutes: defaultPrepMinutes}}
  ).exec();

  const adminResult = await AdminModel.updateMany(
    {$or: [{defaultPrepMinutes: null}, {defaultPrepMinutes: {$exists: false}}]},
    {$set: {defaultPrepMinutes: defaultPrepMinutes}}
  ).exec();

  // Orders placed before this feature have no estimate. Leaving them null means
  // they are never flagged, which is the safe outcome for historical records.
  const orderResult = await OrderModel.updateMany(
    {estimatedPrepMinutes: {$exists: false}},
    {$set: {estimatedPrepMinutes: null, estimatedReadyAt: null}}
  ).exec();

  console.log(
    [
      `Default prep time: ${defaultPrepMinutes} min`,
      `Products backfilled: ${productResult.modifiedCount}`,
      `Admins backfilled: ${adminResult.modifiedCount}`,
      `Orders normalised: ${orderResult.modifiedCount} (left untracked)`
    ].join('\n')
  );
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
