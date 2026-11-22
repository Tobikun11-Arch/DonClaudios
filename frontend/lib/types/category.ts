export type CategoryType = 'catering' | 'in_store';

export type StockUnit = 'kg' | 'piece' | 'can' | 'pitcher';

export type Category = {
  _id: string;
  key: string;
  name: string;
  type: CategoryType;
  stockUnit: StockUnit;
  /** Menu position: lower first (Add-ons always last). */
  sortOrder: number;
  /** Shown as a chip in the menu's top bar; the rest are in the Categories panel. */
  showInTopBar?: boolean;
  imageUrl?: string | null;
  /** Hours of notice customers must give (lechon). Null = none / default. */
  minNoticeHours?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListCategoriesResponse = {
  categories: Category[];
};

export type CreateCategoryBody = {
  name: string;
  type: CategoryType;
  stockUnit: StockUnit;
  imageUrl?: string | null;
  minNoticeHours?: number | null;
  showInTopBar?: boolean;
};

export type CreateCategoryResponse = {
  category: Category;
};

export type UpdateCategoryBody = Partial<CreateCategoryBody>;

export type UpdateCategoryResponse = {
  category: Category;
};

export type DeleteCategoryResponse = {
  message: string;
};