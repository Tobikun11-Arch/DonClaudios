export type PromoFormState = {
  title: string;
  description: string;
  imageUrl: string;
  promoType: 'percentage' | 'fixed_amount' | 'bundle';
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
  discountRate: '',
  discountAmount: '',
  productIds: [],
  startDate: '',
  endDate: '',
  isActive: true
};
