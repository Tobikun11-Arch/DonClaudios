export type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ListProductsResponse = {
  products: Product[];
};

export type GetProductResponse = {
  product: Product;
};

export type CreateProductBody = {
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
};

export type CreateProductResponse = {
  product: Product;
};

export type UpdateProductBody = Partial<CreateProductBody>;

export type UpdateProductResponse = {
  product: Product;
};

export type DeleteProductResponse = {
  message: string;
};
