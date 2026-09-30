export type StatCardData = {
  key: 'todaySales' | 'totalRevenue' | 'productsInStock' | 'customers';
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  context?: string;
};

export type DashboardValueSplit = {
  collected: number;
  collectedOrders: number;
  open: number;
  openOrders: number;
  placed: number;
  stuckOrders: number;
  stuckValue: number;
  oldestStuckDays: number | null;
  staleAfterDays: number;
};

export type DashboardSummaryResponse = {
  cards: StatCardData[];
  valueSplit?: DashboardValueSplit;
};

export type SalesDay = {
  date: string;
  revenue: number;
  orders?: number;
  /** Value placed that day that is still unfulfilled. */
  openRevenue?: number;
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
