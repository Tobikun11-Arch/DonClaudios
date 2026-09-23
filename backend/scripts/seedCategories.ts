import {connectDb} from '../api/config/db';
import {
  CategoryModel,
  slugifyCategoryName,
  type CategoryDocument
} from '../api/models/Category.model';
import {type AnyBulkWriteOperation} from 'mongoose';

type SeedEntry = {
  name: string;
  type: CategoryDocument['type'];
  stockUnit: CategoryDocument['stockUnit'];
};

const SEED: SeedEntry[] = [
  // Catering / by-weight side (Price List menu)
  {name: 'Cochinillo', type: 'catering', stockUnit: 'kg'},
  {name: 'Lechon de Leche', type: 'catering', stockUnit: 'kg'},
  {name: 'Lechon Belly', type: 'catering', stockUnit: 'kg'},
  {name: 'Traditional Lechon', type: 'catering', stockUnit: 'kg'},
  // In-store / per-plate side (regular Menu)
  {name: 'Appetizers', type: 'in_store', stockUnit: 'piece'},
  {name: 'Rice Meals', type: 'in_store', stockUnit: 'piece'},
  {name: 'Pasta', type: 'in_store', stockUnit: 'piece'},
  {name: 'Drinks', type: 'in_store', stockUnit: 'can'}
];

async function main() {
  await connectDb();

  const operations: AnyBulkWriteOperation<CategoryDocument>[] = SEED.map(
    (entry, index) => {
      const key = slugifyCategoryName(entry.name);
      return {
        updateOne: {
          filter: {key},
          update: {
            $set: {
              key,
              name: entry.name,
              type: entry.type,
              stockUnit: entry.stockUnit,
              sortOrder: index
            }
          },
          upsert: true
        }
      };
    }
  );

  const result = await CategoryModel.bulkWrite(operations);
  console.log(
    `Menu categories seeded: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${SEED.length} total.`
  );
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});