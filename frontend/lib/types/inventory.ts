import type {Product} from './product';

export type StockMovement = {
  _id: string;
  productId: {_id: string; name: string} | string;
  type: 'restock' | 'adjustment' | 'spoilage' | 'sold';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  performedBy: {_id: string; firstName: string; lastName: string} | string;
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
