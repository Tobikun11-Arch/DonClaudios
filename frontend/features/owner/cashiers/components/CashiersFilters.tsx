import type {ReactNode} from 'react';
import {Input} from '@/components/ui/input';
import {Search} from 'lucide-react';

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  /** Shown at the end of the search row (e.g. Add Cashier inside Settings). */
  action?: ReactNode;
}

export function CashiersFilters({query, onQueryChange, action}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search cashiers by name, email, or username"
          className="pl-9"
        />
      </div>
      {action && <div className="flex shrink-0 justify-end">{action}</div>}
    </div>
  );
}
