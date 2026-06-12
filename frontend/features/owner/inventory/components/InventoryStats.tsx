import {Package, AlertTriangle, XCircle} from 'lucide-react';

interface Props {
  total: number;
  lowStock: number;
  outOfStock: number;
}

export function InventoryStats({total, lowStock, outOfStock}: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e9f5ee] flex items-center justify-center">
            <Package className="h-5 w-5 text-[#2d4a35]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Items</p>
            <p className="text-lg font-extrabold text-gray-900">{total}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-amber-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Low Stock</p>
            <p className="text-lg font-extrabold text-amber-600">{lowStock}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-red-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Out of Stock</p>
            <p className="text-lg font-extrabold text-red-600">{outOfStock}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
