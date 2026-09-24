export type CategoryType = 'catering' | 'in_store';

export type StockUnit = 'kg' | 'piece' | 'can' | 'pitcher';

export type Category = {
  _id: string;
  key: string;
  name: string;
  type: CategoryType;
  stockUnit: StockUnit;
  sortOrder: number;
  imageUrl?: string | null;
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