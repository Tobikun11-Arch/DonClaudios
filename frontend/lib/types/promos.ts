export type PromoFormState = {
  title: string;
  description: string;
  imageUrl: string;
  promoType: 'percentage' | 'fixed_amount' | 'bundle';
  price: string;
  discountRate: string;
  discountAmount: string;
  productIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export const emptyPromoForm: PromoFormState = {
  title: '',
  description: '',
  imageUrl: '',
  promoType: 'percentage',
  price: '',
  discountRate: '',
  discountAmount: '',
  productIds: [],
  startDate: '',
  endDate: '',
  isActive: true
};
