import {Input} from '@/components/ui/input';
import {Search} from 'lucide-react';

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
}

export function CashiersFilters({query, onQueryChange}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search cashiers by name, email, or username"
          className="pl-9"
        />
      </div>
    </div>
  );
}
