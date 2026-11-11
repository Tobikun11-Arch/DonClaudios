'use client';

import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {
  Flame,
  Search,
  SearchX,
  type LucideIcon
} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import type {Product, ProductAllergen} from '@/lib/types/product';
import type {Promo} from '@/lib/types/promo';
import {useBestSellerIds} from '@/lib/hooks/products/useBestSellers';
import {
  buildMenu,
  FEATURED_TAB_ID,
  filterMenuItems,
  type MenuItem,
  type MenuSort
} from '../menuItems';
import {MenuCategoryChips} from './MenuCategoryChips';
import {MenuFilterButton} from './MenuFilterButton';
import {MenuItemCard, MenuItemCardSkeleton} from './MenuItemCard';

const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4';

const EMPTY_IDS: string[] = [];

/** Icons for the curated Featured sections; category sections have none. */
const SECTION_ICONS: Record<string, LucideIcon> = {
  'best-sellers': Flame
};

/**
 * The customer-facing menu, shared by the guest `/order` page and the signed-in
 * customer dashboard. Each page keeps its own cart logic and passes `onAdd`.
 */
export function MenuBrowser({
  products,
  promos,
  categoryImages,
  basePath,
  isLoading,
  isError,
  signedIn,
  cartQtyById,
  onAdd,
  headerAction,
  stickyClassName
}: {
  /** Products the viewer may see (already filtered to available ones). */
  products: Product[];
  promos: Promo[];
  categoryImages: Record<string, string | undefined>;
  /** Route prefix for detail pages: 'order' or 'customer/dashboard'. */
  basePath: string;
  isLoading: boolean;
  isError: boolean;
  signedIn: boolean;
  cartQtyById: Record<string, number>;
  onAdd: (item: MenuItem) => void;
  /** Extra control on the heading row, e.g. the guest "Track order" link. */
  headerAction?: ReactNode;
  /** Sticky offset and background for the category bar (depends on the page header). */
  stickyClassName: string;
}) {
  const [activeTab, setActiveTab] = useState(FEATURED_TAB_ID);
  const [query, setQuery] = useState('');
  const [excluded, setExcluded] = useState<Set<ProductAllergen>>(() => new Set());
  const [sort, setSort] = useState<MenuSort>('recommended');
  const resultsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef(false);

  const bestSellersQuery = useBestSellerIds();
  const bestSellerIds = bestSellersQuery.data ?? EMPTY_IDS;

  const {tabs, featuredSections, categorySections} = useMemo(
    () =>
      buildMenu({products, promos, basePath, categoryImages, bestSellerIds}),
    [products, promos, basePath, categoryImages, bestSellerIds]
  );

  // Featured is dropped when it has nothing, so fall back to the first tab.
  const resolvedTab = tabs.some(t => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? FEATURED_TAB_ID);
  const onFeatured = resolvedTab === FEATURED_TAB_ID;

  const sections = useMemo(() => {
    // Featured: best sellers. Promos and each category: just that tab.
    const source = onFeatured
      ? featuredSections
      : categorySections.filter(s => s.id === resolvedTab);
    return source
      .map(section => ({
        ...section,
        items: filterMenuItems(section.items, {query, excludedAllergens: excluded, sort})
      }))
      .filter(section => !onFeatured || section.items.length > 0);
  }, [onFeatured, resolvedTab, featuredSections, categorySections, query, excluded, sort]);

  const nothingFound = sections.every(s => s.items.length === 0);
  const filtersActive = query.trim().length > 0 || excluded.size > 0;

  const selectTab = (id: string) => {
    // If the results already start above the stuck category bar, the customer
    // is scrolled into the list: bring them back to the first item of the
    // new category once it renders (a short category would otherwise leave
    // them looking at the footer).
    const results = resultsRef.current;
    const bar = barRef.current;
    if (results && bar) {
      pendingScrollRef.current =
        results.getBoundingClientRect().top < bar.getBoundingClientRect().bottom;
    }
    setActiveTab(id);
  };

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    resultsRef.current?.scrollIntoView({block: 'start'});
  }, [resolvedTab]);

  const clearFilters = () => {
    setQuery('');
    setExcluded(new Set());
  };

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#2d4a35] sm:text-4xl dark:text-[#7ed4a0]">
            Menu
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tap + to add, or tap an item for details.
          </p>
        </div>
        {headerAction}
      </div>

      <div className="mt-4 flex items-center gap-2 sm:gap-3">
        <MenuFilterButton
          excluded={excluded}
          onExcludedChange={setExcluded}
          sort={sort}
          onSortChange={setSort}
        />
        <div className="relative flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999] dark:text-gray-400" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="h-11 rounded-full border-0 bg-[#F0F0F0] pl-11 text-gray-800 focus-visible:ring-2 focus-visible:ring-[#2d4a35]/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div ref={barRef} className={cn('sticky z-30 mt-3 py-2', stickyClassName)}>
        <MenuCategoryChips tabs={tabs} activeId={resolvedTab} onSelect={selectTab} />
      </div>

      <div ref={resultsRef} className="scroll-mt-32 pt-3">
        {isLoading ? (
          <div className={GRID}>
            {Array.from({length: 8}).map((_, i) => (
              <MenuItemCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load the menu. Please refresh the page.</p>
        ) : nothingFound ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
            <SearchX className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 font-semibold text-gray-800 dark:text-gray-100">No items match</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filtersActive ? 'Try another search or clear your filters.' : 'Nothing is available here right now.'}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 min-h-[40px] rounded-full bg-[#2d4a35] px-5 text-sm font-semibold text-white hover:bg-[#24402c]"
              >
                Clear search and filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(({id, label, items}) => {
              const Icon = SECTION_ICONS[id];
              return (
              <div key={id}>
                <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-[22px] dark:text-gray-100">
                  {Icon && (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2d4a35]/10 text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  {label}
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </h3>
                <div className={GRID}>
                  {items.map(item => (
                    <MenuItemCard
                      key={`${id}-${item.id}`}
                      item={item}
                      cartQty={cartQtyById[item.id] ?? 0}
                      guestLocked={item.isPreOrder && !signedIn}
                      onAdd={() => onAdd(item)}
                    />
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
