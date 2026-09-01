import {httpClient} from './httpClient';

type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
};

type RegisterResponse = {
  id: string;
  email: string;
};

type LoginResponse = {
  user: {
    id: string;
    email: string;
    type: 'admin' | 'cashier' | 'customer';
  };
};
type LogoutResponse = {message: string};

type MeResponse = {
  user: {
    id: string;
    type: 'admin' | 'cashier' | 'customer';
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    username?: string;
    businessName?: string;
    businessLogo?: string;
    storeAddress?: string;
    businessContactNumber?: string;
    operatingHours?: string;
    businessType?: string;
  };
};

export type MeUser = MeResponse['user'];

type UpdateProfileResponse = {
  user: MeUser;
};

export type UpdateProfileBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  username?: string;
  businessName?: string;
  businessLogo?: string;
  storeAddress?: string;
  businessContactNumber?: string;
  operatingHours?: string;
  businessType?: string;
};

type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

type SessionsResponse = {
  sessions: {
    device: string;
    location: string;
    lastActive: string;
    isCurrent?: boolean;
  }[];
};

export async function registerCustomer(data: RegisterRequest) {
  const res = await httpClient.post<RegisterResponse>('/auth/register', data);
  return res.data;
}

export async function verifyCustomerEmail(params: {
  email: string;
  code: string;
}) {
  const res = await httpClient.post<{message: string}>('/auth/verify', params);
  return res.data;
}

export async function resendVerificationCode(params: {email: string}) {
  const res = await httpClient.post<{message: string}>(
    '/auth/resend-verification',
    params
  );
  return res.data;
}

export async function login(params: {email: string; password: string}) {
  const res = await httpClient.post<LoginResponse>('/auth/login', params);
  return res.data;
}

export async function logout() {
  const res = await httpClient.post<LogoutResponse>('/auth/logout');
  return res.data;
}

export async function getMe() {
  const res = await httpClient.get<MeResponse>('/auth/me');
  return res.data;
}

export async function updateProfile(body: UpdateProfileBody) {
  const res = await httpClient.put<UpdateProfileResponse>(
    '/auth/profile',
    body
  );
  return res.data;
}

export async function changePassword(body: ChangePasswordBody) {
  const res = await httpClient.put<{message: string}>('/auth/password', body);
  return res.data;
}

export async function getSessions() {
  const res = await httpClient.get<SessionsResponse>('/auth/sessions');
  return res.data;
}
