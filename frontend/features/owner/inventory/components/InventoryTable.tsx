'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {getStockStatus, stockStatusConfig} from '../utils/stockStatus';
import {Package, Search, Plus, Minus, History, Loader2} from 'lucide-react';
import Image from 'next/image';
import type {Product} from '@/lib/types/product';

interface Props {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  search: string;
  statusFilter: string;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void;
  onRestock: (p: Product) => void;
  onAdjust: (p: Product) => void;
  onHistory: (p: Product) => void;
  errorMessage?: string;
}

const FILTER_OPTIONS = [
  {label: 'All', value: 'all'},
  {label: 'In Stock', value: 'in_stock'},
  {label: 'Low Stock', value: 'low_stock'},
  {label: 'Out of Stock', value: 'out_of_stock'}
] as const;

export function InventoryTable({
  products,
  isLoading,
  isError,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onRestock,
  onAdjust,
  onHistory,
  errorMessage
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onStatusFilterChange(opt.value)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-[#2d4a35] text-white border-[#2d4a35]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {isError && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 text-sm text-red-700">
          {errorMessage ?? 'Failed to load inventory.'}
        </div>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            No products found
          </h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {search
              ? 'Try a different search term.'
              : 'Add products first to manage inventory.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const status = getStockStatus(p.stock);
                  const config = stockStatusConfig[status];
                  return (
                    <tr
                      key={p._id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-400 sm:hidden">
                              {p.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                        {p.category}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-extrabold text-gray-900">
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden md:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${config.bg} ${config.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                          />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRestock(p)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Restock"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAdjust(p)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Adjust Stock"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onHistory(p)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
