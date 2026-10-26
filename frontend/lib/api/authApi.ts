import {httpClient} from './httpClient';

type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
  carrier?: 'globe_dito' | 'smart_tnt';
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
    username?: string;    profilePhoto?: string;
    businessName?: string;
    businessLogo?: string;
    storeAddress?: string;
    businessContactNumber?: string;
    operatingHours?: string;
    businessType?: string;
    openingTime?: string;
    closingTime?: string;
    advanceCloseMinutes?: number;
    defaultPrepMinutes?: number;
    isManuallyClosed?: boolean;
    isManuallyOpen?: boolean;
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
  address?: string;
  username?: string;
  profilePhoto?: string;
  businessName?: string;
  businessLogo?: string;
  storeAddress?: string;
  businessContactNumber?: string;
  operatingHours?: string;
  businessType?: string;
  openingTime?: string;
  closingTime?: string;
  advanceCloseMinutes?: number;
  defaultPrepMinutes?: number;
  isManuallyClosed?: boolean;
  isManuallyOpen?: boolean;
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

export async function verifyCustomerPhone(params: {
  phoneNumber: string;
  code: string;
}) {
  const res = await httpClient.post<{message: string}>('/auth/verify', params);
  return res.data;
}

export async function resendVerificationCode(params: {phoneNumber: string}) {
  const res = await httpClient.post<{message: string}>(
    '/auth/resend-verification',
    params
  );
  return res.data;
}

export async function verifyCustomerEmail(params: {email: string; code: string}) {
  const res = await httpClient.post<{message: string}>('/auth/verify-email', params);
  return res.data;
}

export async function resendVerificationEmailCode(params: {email: string}) {
  const res = await httpClient.post<{message: string}>(
    '/auth/resend-verification-email',
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

export async function forgotPassword(email: string) {
  const res = await httpClient.post<{message: string}>('/auth/forgot-password', {
    email
  });
  return res.data;
}

export async function resetPassword(params: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const res = await httpClient.post<{message: string}>(
    '/auth/reset-password',
    params
  );
  return res.data;
}

export async function verifyResetCode(params: {email: string; code: string}) {
  const res = await httpClient.post<{message: string}>(
    '/auth/verify-reset-code',
    params
  );
  return res.data;
}

export async function getSessions() {
  const res = await httpClient.get<SessionsResponse>('/auth/sessions');
  return res.data;
}
