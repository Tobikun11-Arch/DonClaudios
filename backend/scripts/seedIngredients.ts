import {connectDb} from '../api/config/db';
import {
  IngredientModel,
  slugifyIngredientName,
  type IngredientDocument
} from '../api/models/Ingredient.model';
import {type AnyBulkWriteOperation} from 'mongoose';

type SeedEntry = {name: string; iconKey: string};

const SEED: SeedEntry[] = [
  // Meat / poultry
  {name: 'Pork Belly', iconKey: 'meat'},
  {name: 'Lechon', iconKey: 'meat'},
  {name: 'Bulaklak (Pork)', iconKey: 'meat'},
  {name: 'Pork', iconKey: 'meat'},
  {name: 'Pork Blood', iconKey: 'meat'},
  {name: 'Pork Intestines', iconKey: 'meat'},
  {name: 'Pork Sisig', iconKey: 'meat'},
  {name: 'Chicken Liver', iconKey: 'meat'},
  {name: 'Fried Chicken', iconKey: 'meat'},
  {name: 'Chicken Wings', iconKey: 'meat'},
  {name: 'Chicken Breast', iconKey: 'meat'},
  {name: 'Beef Tapa', iconKey: 'meat'},
  {name: 'Hungarian Sausage', iconKey: 'meat'},
  {name: 'Bacon', iconKey: 'meat'},
  {name: 'Hotdog', iconKey: 'meat'},
  // Beef
  {name: 'Ground Beef', iconKey: 'beef'},
  {name: 'Beef Slices', iconKey: 'beef'},
  // Fish / seafood
  {name: 'Milkfish (Bangus)', iconKey: 'fish'},
  // Egg
  {name: 'Fried Egg', iconKey: 'egg'},
  {name: 'Egg', iconKey: 'egg'},
  // Grain
  {name: 'Garlic Rice', iconKey: 'grain'},
  {name: 'Steamed Rice', iconKey: 'grain'},
  {name: 'Spaghetti', iconKey: 'grain'},
  {name: 'Pasta', iconKey: 'grain'},
  {name: 'Flour', iconKey: 'grain'},
  {name: 'Breadcrumbs', iconKey: 'grain'},
  {name: 'Tortilla Chips', iconKey: 'grain'},
  // Dairy
  {name: 'Cream Sauce', iconKey: 'dairy'},
  {name: 'Butter', iconKey: 'dairy'},
  {name: 'Parmesan', iconKey: 'dairy'},
  {name: 'Cheese', iconKey: 'dairy'},
  {name: 'Mayonnaise', iconKey: 'dairy'},
  {name: 'Cream', iconKey: 'dairy'},
  {name: 'Sour Cream', iconKey: 'dairy'},
  // Soy / beans / legumes
  {name: 'Soy Sauce', iconKey: 'soy'},
  {name: 'Tofu', iconKey: 'soy'},
  {name: 'String Beans', iconKey: 'soy'},
  // Nuts
  {name: 'Peanuts', iconKey: 'nut'},
  {name: 'Peanut Sauce', iconKey: 'nut'},
  // Spice / aromatics
  {name: 'Garlic', iconKey: 'spice'},
  {name: 'Onion', iconKey: 'spice'},
  {name: 'Chili', iconKey: 'spice'},
  {name: 'Chili Flakes', iconKey: 'spice'},
  {name: 'Black Pepper', iconKey: 'spice'},
  {name: 'Paprika', iconKey: 'spice'},
  {name: 'Annatto (Atsuete)', iconKey: 'spice'},
  {name: 'Parsley', iconKey: 'spice'},
  {name: 'Jalapeño', iconKey: 'spice'},
  // Vegetables
  {name: 'Bell Pepper', iconKey: 'vegetable'},
  {name: 'Kangkong (Water Spinach)', iconKey: 'vegetable'},
  {name: 'Bok Choy (Pechay)', iconKey: 'vegetable'},
  {name: 'Lettuce', iconKey: 'vegetable'},
  {name: 'Cucumber', iconKey: 'vegetable'},
  {name: 'Tomato', iconKey: 'vegetable'},
  {name: 'Banana Blossom', iconKey: 'vegetable'},
  // Root vegetables
  {name: 'Potato (Mojos)', iconKey: 'root'},
  {name: 'Radish', iconKey: 'root'},
  // Citrus
  {name: 'Calamansi', iconKey: 'citrus'},
  {name: 'Tamarind', iconKey: 'citrus'},
  {name: 'Lemon', iconKey: 'citrus'},
  // Broth / soup base
  {name: 'Pork Broth', iconKey: 'soup'},
  {name: 'Beef Broth', iconKey: 'soup'},
  // Sauces / dressings
  {name: 'Vinegar', iconKey: 'condiment'},
  {name: 'Olive Oil', iconKey: 'condiment'},
  {name: 'Fish Sauce', iconKey: 'condiment'},
  {name: 'Hot Sauce', iconKey: 'condiment'},
  {name: 'Buffalo Sauce', iconKey: 'condiment'},
  {name: 'Liver Sauce', iconKey: 'condiment'},
  {name: 'Tomato Sauce', iconKey: 'condiment'},
  {name: 'Salad Dressing', iconKey: 'salad'},
  {name: 'Salsa', iconKey: 'salad'}
];

async function main() {
  await connectDb();

  const operations: AnyBulkWriteOperation<IngredientDocument>[] = SEED.map(
    entry => {
      const key = slugifyIngredientName(entry.name);
      return {
        updateOne: {
          filter: {key},
          update: {
            $set: {
              key,
              name: entry.name,
              iconKey: entry.iconKey,
              status: 'active' as const
            }
          },
          upsert: true
        }
      };
    }
  );

  const result = await IngredientModel.bulkWrite(operations);
  console.log(
    `Ingredient library seeded: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${SEED.length} total.`
  );
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});