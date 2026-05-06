import {Input} from '@/components/ui/input';

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
}

export function PromosFilters({query, onQueryChange}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <Input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search promos (title/description)"
        />
      </div>
    </div>
  );
}
