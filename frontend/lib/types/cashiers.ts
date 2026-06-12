export type CashierFormState = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phoneNumber: string;
  address: string;
};

export const emptyCashierForm: CashierFormState = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  phoneNumber: '',
  address: ''
};
