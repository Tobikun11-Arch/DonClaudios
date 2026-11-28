export type Cashier = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  address?: string;
  profilePhoto?: string;
  /** Worked out by the API from `lastSeenAt` (cashier app heartbeat, 3 min timeout). */
  isOnline: boolean;
  lastSeenAt?: string | null;
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
  profilePhoto?: string;
};

export type CreateCashierResponse = {
  id: string;
  email: string;
  username: string;
};

export type UpdateCashierBody = Partial<CreateCashierBody>;

export type UpdateCashierResponse = {
  cashier: Cashier;
};

export type DeleteCashierResponse = {
  message: string;
};
