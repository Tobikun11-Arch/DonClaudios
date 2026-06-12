export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 10) return 'low_stock';
  return 'in_stock';
}

export const stockStatusConfig: Record<
  StockStatus,
  {label: string; bg: string; text: string; dot: string}
> = {
  in_stock: {
    label: 'In Stock',
    bg: 'bg-[#e9f5ee]',
    text: 'text-[#2d4a35]',
    dot: 'bg-green-500'
  },
  low_stock: {
    label: 'Low Stock',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400'
  },
  out_of_stock: {
    label: 'Out of Stock',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500'
  }
};
