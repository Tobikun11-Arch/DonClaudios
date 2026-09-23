import {
  type LucideIcon,
  Apple,
  Banana,
  Bean,
  Beef,
  Candy,
  Carrot,
  Citrus,
  Coffee,
  Cookie,
  Drumstick,
  Egg,
  Fish,
  Grape,
  LeafyGreen,
  Milk,
  Nut,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Sprout,
  Utensils,
  Wheat
} from 'lucide-react';

export const FALLBACK_INGREDIENT_ICON_KEY = 'other';
export const FALLBACK_INGREDIENT_ICON: LucideIcon = Utensils;

interface IngredientIconEntry {
  key: string;
  Icon: LucideIcon;
  keywords: string[];
}

const ENTRIES: IngredientIconEntry[] = [
  {key: 'egg', Icon: Egg, keywords: ['egg', 'itlog']},
  {
    key: 'beef',
    Icon: Beef,
    keywords: ['beef', 'baka', 'steak', 'tenderloin']
  },
  {
    key: 'fish',
    Icon: Fish,
    keywords: [
      'fish',
      'tuna',
      'bangus',
      'salmon',
      'tilapia',
      'tanigue',
      'isda'
    ]
  },
  {
    key: 'shrimp',
    Icon: Shrimp,
    keywords: [
      'shrimp',
      'hipon',
      'prawn',
      'shellfish',
      'crab',
      'alimasag',
      'sugpo',
      'lobster'
    ]
  },
  {
    key: 'meat',
    Icon: Drumstick,
    keywords: [
      'pork',
      'lechon',
      'belly',
      'chicken',
      'manok',
      'ham',
      'tocino',
      'longganisa',
      'sausage',
      'bacon',
      'meat',
      'liempo',
      'pata'
    ]
  },
  {
    key: 'dairy',
    Icon: Milk,
    keywords: ['milk', 'cheese', 'cream', 'butter', 'dairy', 'gatas', 'keso']
  },
  {
    key: 'soy',
    Icon: Bean,
    keywords: [
      'soy',
      'tofu',
      'bean',
      'beans',
      'monggo',
      'chickpea',
      'sitaw',
      'edamame'
    ]
  },
  {
    key: 'grain',
    Icon: Wheat,
    keywords: [
      'rice',
      'kanin',
      'flour',
      'bread',
      'bun',
      'pasta',
      'gluten',
      'wheat',
      'noodles',
      'mami',
      'pancit',
      'spaghetti',
      'corn',
      'mais'
    ]
  },
  {
    key: 'nut',
    Icon: Nut,
    keywords: ['peanut', 'nut', 'mani', 'almond', 'cashew', 'sesame']
  },
  {
    key: 'spice',
    Icon: Sprout,
    keywords: [
      'garlic',
      'bawang',
      'ginger',
      'luya',
      'onion',
      'sibuyas',
      'leek',
      'pepper',
      'paminta',
      'herb',
      'spice',
      'bay leaf',
      'laurel',
      'cilantro',
      'basil',
      'sage'
    ]
  },
  {
    key: 'vegetable',
    Icon: LeafyGreen,
    keywords: [
      'cabbage',
      'lettuce',
      'pechay',
      'kangkong',
      'spinach',
      'vegetable',
      'gulay',
      'greens',
      'broccoli',
      'okra'
    ]
  },
  {
    key: 'root',
    Icon: Carrot,
    keywords: ['carrot', 'potato', 'patatas', 'gabi', 'kamote', 'cassava']
  },
  {
    key: 'citrus',
    Icon: Citrus,
    keywords: ['lemon', 'kalamansi', 'calamansi', 'lime', 'orange', 'citrus']
  },
  {
    key: 'soup',
    Icon: Soup,
    keywords: ['broth', 'stock', 'sabaw', 'soup', 'sinigang', 'nilaga', 'stew']
  },
  {key: 'salad', Icon: Salad, keywords: ['salad', 'ensalada', 'coleslaw']},
  {key: 'sandwich', Icon: Sandwich, keywords: ['sandwich', 'burger']},
  {key: 'coffee', Icon: Coffee, keywords: ['coffee', 'kape']},
  {key: 'cookie', Icon: Cookie, keywords: ['cookie', 'biscuit']},
  {
    key: 'candy',
    Icon: Candy,
    keywords: ['sugar', 'candy', 'asukal', 'sweetener', 'honey', 'syrup']
  },
  {key: 'banana', Icon: Banana, keywords: ['banana', 'saging']},
  {key: 'apple', Icon: Apple, keywords: ['apple', 'mansanas']},
  {key: 'grape', Icon: Grape, keywords: ['grape', 'ubas']}
];

const BY_KEY = new Map(ENTRIES.map(e => [e.key, e]));

export function matchIngredientIcon(term: string): {
  iconKey: string;
  Icon: LucideIcon;
} {
  const t = term.trim().toLowerCase();
  if (!t) {
    return {iconKey: FALLBACK_INGREDIENT_ICON_KEY, Icon: FALLBACK_INGREDIENT_ICON};
  }
  for (const entry of ENTRIES) {
    if (entry.keywords.some(k => t.includes(k))) {
      return {iconKey: entry.key, Icon: entry.Icon};
    }
  }
  return {iconKey: FALLBACK_INGREDIENT_ICON_KEY, Icon: FALLBACK_INGREDIENT_ICON};
}

export function ingredientIconByKey(iconKey?: string): LucideIcon {
  if (!iconKey) return FALLBACK_INGREDIENT_ICON;
  return BY_KEY.get(iconKey)?.Icon ?? FALLBACK_INGREDIENT_ICON;
}