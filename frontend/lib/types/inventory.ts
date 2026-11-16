import type {Product} from './product';

export type StockMovement = {
  _id: string;
  productId: {_id: string; name: string} | string;
  type: 'restock' | 'adjustment' | 'spoilage' | 'sold';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  performedBy: {_id: string; firstName: string; lastName: string} | string | null;
  createdAt: string;
  updatedAt: string;
};

export type RestockBody = {
  quantity: number;
  note?: string;
};

export type AdjustBody = {
  quantity: number;
  reason: 'spoilage' | 'adjustment';
  note?: string;
};

export type RestockResponse = {
  product: Product;
};

export type AdjustResponse = {
  product: Product;
};

export type ListMovementsResponse = {
  movements: StockMovement[];
};

export type InventoryStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type InventorySort = 'attention' | 'name_asc' | 'stock_asc' | 'stock_desc' | 'updated';

export type InventoryProductsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: InventoryStatusFilter;
  category?: string;
  sort?: InventorySort;
};

export type InventoryProductsResponse = {
  products: Product[];
  pagination: {page: number; limit: number; total: number; totalPages: number};
};
