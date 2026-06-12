import {Star} from 'lucide-react';
import type {TopProduct} from '@/lib/types/dashboard';

interface Props {
  products: TopProduct[];
  isLoading: boolean;
  isError: boolean;
}

export function TopProductsTable({products, isLoading, isError}: Props) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h3 className="text-[1rem] font-semibold text-[#1A1A1A]">
            Top Selling Products
          </h3>
          <p className="text-[0.8rem] text-[#6B7280]">
            Best performers this month
          </p>
        </div>
        <Star className="h-4 w-4 text-[#6B7280]" />
      </div>

      {isLoading ? (
        <div className="px-5 py-8 flex items-center justify-center text-sm text-[#6B7280]">
          Loading...
        </div>
      ) : isError ? (
        <div className="px-5 py-8 flex items-center justify-center text-sm text-red-500">
          Failed to load top products
        </div>
      ) : products.length === 0 ? (
        <div className="px-5 py-8 flex items-center justify-center text-sm text-[#6B7280]">
          No sales data yet this month
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-t border-[#E5E7EB]">
              <th className="text-left px-4 py-2.5 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280] w-12">
                Rank
              </th>
              <th className="text-left px-4 py-2.5 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                Product
              </th>
              <th className="text-right px-4 py-2.5 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                Units Sold
              </th>
              <th className="text-right px-4 py-2.5 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr
                key={product.rank}
                className="border-t border-[#E5E7EB] hover:bg-[#E8F0E3] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-[#2D4A1E] text-white flex items-center justify-center text-[0.75rem] font-semibold">
                    {product.rank}
                  </div>
                </td>
                <td className="px-4 py-3 text-[0.875rem] text-[#1A1A1A]">
                  {product.name}
                </td>
                <td className="px-4 py-3 text-[0.875rem] text-[#1A1A1A] text-right">
                  {product.unitsSold}
                </td>
                <td className="px-4 py-3 text-[0.875rem] text-[#1A1A1A] text-right font-medium">
                  ₱{product.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
