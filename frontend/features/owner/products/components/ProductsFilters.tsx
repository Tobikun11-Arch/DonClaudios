import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {Search} from 'lucide-react';

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  productCount: (cat: string) => number;
}

export function ProductsFilters({
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  productCount
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search products"
          className="pl-9"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors border',
              cat === activeCategory
                ? 'bg-[#2d4a35] text-white border-[#2d4a35]'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {cat} ({productCount(cat)})
          </button>
        ))}
      </div>
    </div>
  );
}