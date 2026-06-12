'use client';

import {useState} from 'react';

export function useInventory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  >('all');

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter
  };
}
