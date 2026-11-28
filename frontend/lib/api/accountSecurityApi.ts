import {httpClient} from './httpClient';

export type SignedInUser = {
  id: string;
  email: string;
  type: 'admin' | 'cashier' | 'customer';
};

/** Password, Google or MFA sign-in either signs in, or asks for the emailed code. */
export type SignInResult =
  | {
      mfaRequired?: false;
      user: SignedInUser;
      created?: boolean;
      needsPhoneVerification?: boolean;
      usedBackupCode?: boolean;
      backupCodesLeft?: number;
    }
  | {
      mfaRequired: true;
      /** `email`: we sent a code; `totp`: the code is in their authenticator app. */
      method: 'email' | 'totp';
      challengeToken: string;
      sentTo: string | null;
      user?: undefined;
    };

export async function signInWithGoogle(credential: string, acquisition?: unknown) {
  const res = await httpClient.post<SignInResult>('/auth/google', {credential, acquisition});
  return res.data;
}

export async function verifyMfaSignIn(challengeToken: string, code: string) {
  const res = await httpClient.post<SignInResult>('/auth/mfa/verify', {challengeToken, code});
  return res.data;
}

export async function resendMfaSignInCode(challengeToken: string) {
  const res = await httpClient.post<{sentTo: string; expiresMinutes: number}>('/auth/mfa/resend', {challengeToken});
  return res.data;
}

export async function linkGoogle(credential: string) {
  const res = await httpClient.post<{googleLinked: true; googleEmail: string}>('/auth/google/link', {credential});
  return res.data;
}

export async function unlinkGoogle() {
  const res = await httpClient.post<{googleLinked: false}>('/auth/google/unlink');
  return res.data;
}

export async function setFirstPassword(newPassword: string) {
  const res = await httpClient.post<{hasPassword: true}>('/auth/password/set', {newPassword});
  return res.data;
}

export async function sendPhoneCode(phoneNumber: string) {
  const res = await httpClient.post<{alreadyVerified?: boolean; message?: string}>('/auth/phone/send-code', {phoneNumber});
  return res.data;
}

/** `viaEmail`: Smart/TNT numbers (no SMS) are confirmed by the verified email. */
export async function verifyPhone(phoneNumber: string, code?: string, viaEmail = false) {
  const res = await httpClient.post<{phoneVerified: true; phoneNumber: string}>('/auth/phone/verify', {
    phoneNumber,
    ...(code ? {code} : {}),
    ...(viaEmail ? {viaEmail: true} : {})
  });
  return res.data;
}

export async function sendMfaCode() {
  const res = await httpClient.post<{sentTo: string; expiresMinutes: number}>('/auth/mfa/send-code');
  return res.data;
}

export async function enableMfa(code: string) {
  const res = await httpClient.post<{mfaEnabled: true; backupCodes: string[]}>('/auth/mfa/enable', {code});
  return res.data;
}

/** Authenticator app setup: QR code + the secret for typing in by hand. */
/** `currentCode` is required when two-step is already on (switching methods). */
export async function startTotpSetup(currentCode?: string) {
  const res = await httpClient.post<{qrDataUrl: string; otpauthUrl: string; secret: string}>(
    '/auth/mfa/totp/setup',
    currentCode ? {code: currentCode} : {}
  );
  return res.data;
}

export async function enableTotp(code: string) {
  const res = await httpClient.post<{mfaEnabled: true; method: 'totp'; backupCodes: string[]}>('/auth/mfa/totp/enable', {code});
  return res.data;
}

export async function disableMfa(code: string) {
  const res = await httpClient.post<{mfaEnabled: false}>('/auth/mfa/disable', {code});
  return res.data;
}

export async function setOrderEmails(orderEmailUpdates: boolean) {
  const res = await httpClient.put<{orderEmailUpdates: boolean}>('/auth/me/order-emails', {orderEmailUpdates});
  return res.data;
}

export async function setNewsletter(newsletterOptIn: boolean) {
  const res = await httpClient.put<{newsletterOptIn: boolean}>('/auth/me/newsletter', {newsletterOptIn});
  return res.data;
}

/** Public: one-click unsubscribe with the signed token from a newsletter email. */
export async function unsubscribeNewsletter(token: string) {
  const res = await httpClient.post<{unsubscribed: true}>('/auth/newsletter/unsubscribe', {token});
  return res.data;
}
