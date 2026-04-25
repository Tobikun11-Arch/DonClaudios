export type ProductFormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
};

export const emptyProductForm: ProductFormState = {
  name: '',
  category: '',
  price: '',
  stock: '',
  description: '',
  imageUrl: '',
  isAvailable: true
};
