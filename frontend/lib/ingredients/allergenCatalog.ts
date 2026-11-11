import {
  AlertTriangle,
  Bean,
  Beef,
  Egg,
  Fish,
  Flame,
  Ham,
  Milk,
  Nut,
  Shell,
  Sprout,
  Wheat,
  type LucideIcon
} from 'lucide-react';

/** "allergen" = allergy warning (red); "dietary" = a note like pork (grey). */
export type AllergenKind = 'allergen' | 'dietary';

/** One entry of the allergen list from `GET /api/allergens`. */
export type AllergenOption = {
  /** Database id for owner-added allergens; null for built-ins. */
  id: string | null;
  key: string;
  label: string;
  kind: AllergenKind;
  builtIn: boolean;
};

/**
 * The 12 built-ins, mirrored from the backend. Used until the API answers,
 * so cards never flash raw keys like "tree_nut".
 */
export const BUILT_IN_ALLERGEN_OPTIONS: AllergenOption[] = [
  {id: null, key: 'peanut', label: 'Peanuts', kind: 'allergen', builtIn: true},
  {id: null, key: 'tree_nut', label: 'Tree Nuts', kind: 'allergen', builtIn: true},
  {id: null, key: 'shellfish', label: 'Shellfish', kind: 'allergen', builtIn: true},
  {id: null, key: 'fish', label: 'Fish', kind: 'allergen', builtIn: true},
  {id: null, key: 'egg', label: 'Egg', kind: 'allergen', builtIn: true},
  {id: null, key: 'dairy', label: 'Dairy/Milk', kind: 'allergen', builtIn: true},
  {id: null, key: 'soy', label: 'Soy', kind: 'allergen', builtIn: true},
  {id: null, key: 'gluten', label: 'Gluten/Wheat', kind: 'allergen', builtIn: true},
  {id: null, key: 'sesame', label: 'Sesame', kind: 'allergen', builtIn: true},
  {id: null, key: 'pork', label: 'Pork', kind: 'dietary', builtIn: true},
  {id: null, key: 'beef', label: 'Beef', kind: 'dietary', builtIn: true},
  {id: null, key: 'spicy', label: 'Spicy', kind: 'dietary', builtIn: true}
];

/** Shorter names for small chips on phone cards ("Dairy", not "Dairy/Milk"). */
const SHORT_LABELS: Record<string, string> = {
  tree_nut: 'Tree nuts',
  dairy: 'Dairy',
  gluten: 'Gluten'
};

const ICONS: Record<string, LucideIcon> = {
  peanut: Nut,
  tree_nut: Nut,
  shellfish: Shell,
  fish: Fish,
  egg: Egg,
  dairy: Milk,
  soy: Bean,
  gluten: Wheat,
  sesame: Sprout,
  pork: Ham,
  beef: Beef,
  spicy: Flame
};

export type AllergenCatalog = {
  /** Built-ins first, then owner-added ones. */
  options: AllergenOption[];
  label: (key: string) => string;
  shortLabel: (key: string) => string;
  /** Owner-added allergens use a generic warning icon. */
  icon: (key: string) => LucideIcon;
  isDietary: (key: string) => boolean;
  /** Real allergens first, dietary notes after, each in catalog order. */
  sort: (keys: readonly string[]) => string[];
};

/** "kiwi_fruit" -> "Kiwi fruit", for a key the catalog does not know (yet). */
function humanize(key: string) {
  const text = key.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildAllergenCatalog(options: AllergenOption[]): AllergenCatalog {
  const byKey = new Map(options.map((o, index) => [o.key, {...o, index}]));
  const label = (key: string) => byKey.get(key)?.label ?? humanize(key);
  const isDietary = (key: string) => byKey.get(key)?.kind === 'dietary';
  return {
    options,
    label,
    shortLabel: key => SHORT_LABELS[key] ?? label(key),
    icon: key => ICONS[key] ?? AlertTriangle,
    isDietary,
    sort: keys => {
      const rank = (key: string) => (isDietary(key) ? 1000 : 0) + (byKey.get(key)?.index ?? 999);
      return [...new Set(keys)].sort((a, b) => rank(a) - rank(b));
    }
  };
}

export const DEFAULT_ALLERGEN_CATALOG = buildAllergenCatalog(BUILT_IN_ALLERGEN_OPTIONS);
