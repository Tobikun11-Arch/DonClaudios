export type IngredientStatus = 'active' | 'pending';

export type IngredientItem = {
  _id: string;
  key: string;
  name: string;
  iconKey: string;
  status: IngredientStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ListIngredientsResponse = {
  ingredients: IngredientItem[];
};

export type CreateIngredientBody = {
  name: string;
  iconKey: string;
  status?: IngredientStatus;
};

export type CreateIngredientResponse = {
  ingredient: IngredientItem;
};

export type UpdateIngredientBody = Partial<CreateIngredientBody>;

export type UpdateIngredientResponse = {
  ingredient: IngredientItem;
};

export type DeleteIngredientResponse = {
  message: string;
};