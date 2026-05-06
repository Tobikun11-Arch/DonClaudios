export type Promo = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  promoType: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate?: number;
  discountAmount?: number;
  productIds?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ListPromosResponse = {
  promos: Promo[];
};

export type GetPromoResponse = {
  promo: Promo;
};

export type CreatePromoBody = {
  title: string;
  description?: string;
  imageUrl?: string;
  promoType: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate?: number;
  discountAmount?: number;
  productIds?: string[];
  startDate: string | Date;
  endDate: string | Date;
  isActive?: boolean;
};

export type CreatePromoResponse = {
  promo: Promo;
};

export type UpdatePromoBody = Partial<CreatePromoBody>;

export type UpdatePromoResponse = {
  promo: Promo;
};

export type DeletePromoResponse = {
  message: string;
};
