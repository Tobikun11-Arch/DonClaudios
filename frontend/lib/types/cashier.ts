export type Cashier = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  address?: string;
  isOnline: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListCashiersResponse = {
  cashiers: Cashier[];
};

export type GetCashierResponse = {
  cashier: Cashier;
};

export type CreateCashierBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  phoneNumber?: string;
  address?: string;
};

export type CreateCashierResponse = {
  cashier: Cashier;
};

export type UpdateCashierBody = Partial<CreateCashierBody> & {
  isOnline?: boolean;
  isVerified?: boolean;
};

export type UpdateCashierResponse = {
  cashier: Cashier;
};

export type DeleteCashierResponse = {
  message: string;
};
