export type StatCardData = {
  key: 'todaySales' | 'totalRevenue' | 'productsInStock' | 'customers';
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  context?: string;
};

export type DashboardSummaryResponse = {
  cards: StatCardData[];
};

export type SalesDay = {
  date: string;
  revenue: number;
};

export type SalesTrendResponse = {
  days: SalesDay[];
};

export type CategoryStock = {
  category: string;
  count: number;
};

export type InventoryByCategoryResponse = {
  categories: CategoryStock[];
  dominant: {category: string; count: number};
};

export type TopProduct = {
  rank: number;
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
};

export type TopProductsResponse = {
  products: TopProduct[];
};

export type LowStockItem = {
  productId: string;
  name: string;
  stock: number;
};

export type LowStockResponse = {
  count: number;
  items: LowStockItem[];
};
