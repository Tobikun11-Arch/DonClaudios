import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'crypto';
import {OAuth2Client} from 'google-auth-library';
import {env} from '../config/env';
import {ApiError} from '../utils/error';
import {CustomerModel, type CustomerDocument} from '../models/Customer.model';
import {customerRepository} from '../repositories/customer.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {emailService} from './email.service';
import {guestOtpService} from './guestOtp.service';
import {accountNoticeEmailTemplate} from '../templates/accountNoticeEmail';
import {generateVerificationCode, getVerificationExpiry} from '../utils/verification';
import {toInternationalPhone} from '../utils/phone';
import QRCode from 'qrcode';
import {
  currentStep,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  otpauthUrl,
  verifyTotp
} from '../utils/totp';

const MFA_CODE_MINUTES = 5;
const MFA_MAX_ATTEMPTS = 5;
const MFA_RESEND_COOLDOWN_MS = 60 * 1000;
const BACKUP_CODE_COUNT = 8;
/** Challenge tokens use their own secret so they can never pass as an access token. */
const challengeSecret = () => `${env.JWT_SECRET}:mfa-challenge`;

type UserType = 'customer' | 'cashier' | 'admin';

let googleClient: OAuth2Client | null = null;

function notify(user: {email: string; firstName?: string}, kind: Parameters<typeof accountNoticeEmailTemplate>[0]['kind']) {
  const notice = accountNoticeEmailTemplate({kind, recipientName: user.firstName});
  emailService
    .sendEmail({to: user.email, ...notice})
    .catch(err => console.error(`[auth] ${kind} email failed`, err));
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(2, name.length - 1))}@${domain}`;
}

function newBackupCode() {
  // 10 characters, grouped for reading: "k7f2-9qhx-3m".
  const raw = randomBytes(8).toString('base64').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10).padEnd(10, '7');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

export function signSessionTokens(userId: string, type: UserType) {
  const accessToken = jwt.sign({userId, type}, env.JWT_SECRET, {expiresIn: '15m'});
  const refreshToken = jwt.sign({userId, type}, env.JWT_REFRESH_SECRET, {expiresIn: '7d'});
  return {accessToken, refreshToken};
}

/**
 * Google accounts start without a phone number, so they must add and verify
 * one before ordering. Password sign-ups verified their contact at sign-up.
 */
export function needsPhoneVerification(
  customer: Pick<CustomerDocument, 'signupMethod' | 'phoneVerified' | 'phoneNumber' | 'phoneConfirmedByEmail'>
) {
  if (customer.signupMethod !== 'google') return false;
  if (!customer.phoneNumber) return true;
  return !customer.phoneVerified && !customer.phoneConfirmedByEmail;
}

export const accountSecurityService = {
  /* ------------------------------------------------------------ Google */

  async verifyGoogleCredential(credential: string) {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not set up yet.');
    }
    googleClient ??= new OAuth2Client(env.GOOGLE_CLIENT_ID);
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error('No subject');
      return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === true,
        firstName: payload.given_name?.trim() || payload.name?.split(' ')[0] || 'Customer',
        lastName: payload.family_name?.trim() || payload.name?.split(' ').slice(1).join(' ') || '-',
        picture: payload.picture ?? null
      };
    } catch {
      throw new ApiError(401, 'GOOGLE_INVALID', 'Google sign-in failed. Please try again.');
    }
  },

  /**
   * "Continue with Google": finds the customer by Google id, else links an
   * existing account with the same (Google-verified) email, else creates one.
   * Staff and owner accounts keep password sign-in.
   */
  async signInWithGoogle(credential: string, acquisition?: unknown) {
    const google = await this.verifyGoogleCredential(credential);
    if (!google.emailVerified) {
      throw new ApiError(400, 'GOOGLE_EMAIL_UNVERIFIED', 'Your Google email is not verified. Verify it with Google first.');
    }

    let customer = await CustomerModel.findOne({googleId: google.sub}).exec();
    let created = false;
    if (!customer) {
      const [byEmail, cashier, admin] = await Promise.all([
        customerRepository.findByEmail(google.email),
        cashierRepository.findByEmailOrPhoneNumber(google.email),
        adminRepository.findByEmailOrPhoneNumber(google.email)
      ]);
      if (!byEmail && (cashier || admin)) {
        throw new ApiError(400, 'GOOGLE_STAFF_ACCOUNT', 'Staff accounts sign in with email and password.');
      }
      if (byEmail) {
        // Google proved this person owns the mailbox, so the accounts are linked.
        await CustomerModel.updateOne(
          {_id: byEmail._id},
          {$set: {googleId: google.sub, googleEmail: google.email, isVerified: true}}
        ).exec();
        customer = await CustomerModel.findById(byEmail._id).exec();
        if (customer) notify(customer, 'google_linked');
      } else {
        customer = await CustomerModel.create({
          firstName: google.firstName,
          lastName: google.lastName,
          email: google.email,
          passwordHash: null,
          googleId: google.sub,
          googleEmail: google.email,
          signupMethod: 'google',
          isVerified: true,
          phoneVerified: false,
          profilePhoto: google.picture ?? undefined,
          ...(acquisition ? {acquisition} : {})
        } as any);
        created = true;
      }
    }
    if (!customer) throw new ApiError(500, 'GOOGLE_FAILED', 'Google sign-in failed. Please try again.');
    return {customer, created};
  },

  async linkGoogle(customerId: string, credential: string) {
    const google = await this.verifyGoogleCredential(credential);
    const owner = await CustomerModel.findOne({googleId: google.sub}).select('_id').lean().exec();
    if (owner && String(owner._id) !== customerId) {
      throw new ApiError(409, 'GOOGLE_IN_USE', 'That Google account is already linked to another DonClaudios account.');
    }
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    await CustomerModel.updateOne({_id: customerId}, {$set: {googleId: google.sub, googleEmail: google.email}}).exec();
    notify(customer, 'google_linked');
    return {googleEmail: google.email};
  },

  async unlinkGoogle(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    if (!customer.passwordHash) {
      throw new ApiError(400, 'PASSWORD_REQUIRED', 'Set a password first, so you can still sign in after unlinking Google.');
    }
    await CustomerModel.updateOne({_id: customerId}, {$unset: {googleId: 1}, $set: {googleEmail: null}}).exec();
    notify(customer, 'google_unlinked');
  },

  /** Google-only accounts add a password (no current password to check). */
  async setPassword(customerId: string, newPassword: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    if (customer.passwordHash) {
      throw new ApiError(400, 'PASSWORD_EXISTS', 'You already have a password. Use Change password instead.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await CustomerModel.updateOne({_id: customerId}, {$set: {passwordHash}}).exec();
  },

  /* ------------------------------------------------ Phone (signed in) */

  async sendPhoneCode(customerId: string, phoneNumber: string) {
    const normalized = toInternationalPhone(phoneNumber);
    if (!normalized) throw new ApiError(400, 'INVALID_PHONE', 'Invalid Philippine mobile number format');
    await this.assertPhoneFree(customerId, normalized);
    return guestOtpService.sendOtp(normalized);
  },

  async verifyPhone(customerId: string, phoneNumber: string, code?: string, viaEmail = false) {
    const normalized = toInternationalPhone(phoneNumber);
    if (!normalized) throw new ApiError(400, 'INVALID_PHONE', 'Invalid Philippine mobile number format');
    await this.assertPhoneFree(customerId, normalized);
    if (viaEmail) {
      // Smart/TNT: no SMS. Google already verified the email, so that confirms the contact.
      const customer = await customerRepository.findById(customerId);
      if (!customer?.isVerified) {
        throw new ApiError(400, 'EMAIL_NOT_VERIFIED', 'Verify your email first.');
      }
      await CustomerModel.updateOne(
        {_id: customerId},
        {$set: {phoneNumber: normalized, phoneConfirmedByEmail: true}}
      ).exec();
      return {phoneNumber: normalized};
    }
    if (code) {
      await guestOtpService.verifyOtp(normalized, code);
    } else if (!(await guestOtpService.isPhoneVerified(normalized))) {
      throw new ApiError(400, 'INVALID_CODE', 'Enter the code we sent to your phone.');
    }
    await CustomerModel.updateOne(
      {_id: customerId},
      {$set: {phoneNumber: normalized, phoneVerified: true}}
    ).exec();
    return {phoneNumber: normalized};
  },

  async assertPhoneFree(customerId: string, normalized: string) {
    const other = await CustomerModel.findOne({phoneNumber: normalized, _id: {$ne: customerId}})
      .select('_id')
      .lean()
      .exec();
    if (other) throw new ApiError(409, 'PHONE_IN_USE', 'That number is already used by another account.');
  },

  /* --------------------------------------------------------------- MFA */

  isMfaOn(user: any, type: UserType) {
    return type === 'customer' && user?.mfa?.enabled === true;
  },

  /**
   * First step of a two-step sign-in: email users get a code now; app users
   * open their authenticator. The response tells the page which one.
   */
  async beginSignInChallenge(customer: any) {
    const id = String(customer._id);
    const method: 'email' | 'totp' = customer.mfa?.method === 'totp' ? 'totp' : 'email';
    const sent = method === 'email' ? await this.sendMfaCode(id).catch(() => null) : null;
    return {
      mfaRequired: true as const,
      method,
      challengeToken: this.createChallenge(id),
      sentTo: sent?.sentTo ?? null
    };
  },

  /** Authenticator app setup, step 1: a new secret as a QR code (not active yet). */
  async startTotpSetup(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    const secret = generateTotpSecret();
    await CustomerModel.updateOne(
      {_id: customerId},
      {
        $set: {
          'mfa.totpPending': encryptSecret(secret),
          ...(customer.mfa ? {} : {'mfa.enabled': false, 'mfa.method': 'email', 'mfa.backupCodes': []})
        }
      }
    ).exec();
    const url = otpauthUrl(secret, customer.email);
    const qrDataUrl = await QRCode.toDataURL(url, {margin: 1, width: 220});
    // Grouped for typing by hand when the QR can't be scanned.
    return {qrDataUrl, otpauthUrl: url, secret: secret.replace(/(.{4})/g, '$1 ').trim()};
  },

  /** Authenticator app setup, step 2: the first app code proves it works, then it is turned on. */
  async enableTotp(customerId: string, code: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    const pending = customer.mfa?.totpPending;
    if (!pending) throw new ApiError(400, 'TOTP_NOT_STARTED', 'Start the authenticator setup again.');
    const step = verifyTotp(decryptSecret(pending), code);
    if (step === null) {
      throw new ApiError(400, 'INVALID_CODE', 'That code is not correct. Check the time on your phone and try the newest code.');
    }
    const codes = Array.from({length: BACKUP_CODE_COUNT}, newBackupCode);
    const hashes = await Promise.all(codes.map(c => bcrypt.hash(c, 10)));
    await CustomerModel.updateOne(
      {_id: customerId},
      {
        $set: {
          'mfa.enabled': true,
          'mfa.method': 'totp',
          'mfa.totpSecret': pending,
          'mfa.totpPending': null,
          'mfa.totpLastStep': step,
          'mfa.backupCodes': hashes,
          'mfa.enabledAt': new Date(),
          'mfa.codeAttempts': 0
        }
      }
    ).exec();
    notify(customer, 'mfa_enabled');
    return {backupCodes: codes};
  },

  async sendMfaCode(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    if (customer.mfa?.enabled && customer.mfa.method === 'totp') {
      throw new ApiError(400, 'USE_AUTHENTICATOR', 'Open your authenticator app for the code, or use a backup code.');
    }
    const sentAt = customer.mfa?.codeSentAt ? new Date(customer.mfa.codeSentAt).getTime() : 0;
    const waitMs = MFA_RESEND_COOLDOWN_MS - (Date.now() - sentAt);
    if (waitMs > 0) {
      throw new ApiError(429, 'RESEND_COOLDOWN', `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code`);
    }
    const code = generateVerificationCode();
    await CustomerModel.updateOne(
      {_id: customerId},
      {
        $set: {
          'mfa.codeHash': await bcrypt.hash(code, 10),
          'mfa.codeExpiry': getVerificationExpiry(MFA_CODE_MINUTES),
          'mfa.codeAttempts': 0,
          'mfa.codeSentAt': new Date(),
          ...(customer.mfa ? {} : {'mfa.enabled': false, 'mfa.method': 'email', 'mfa.backupCodes': []})
        }
      }
    ).exec();
    const greeting = customer.firstName ? `Hi ${customer.firstName},` : 'Hi,';
    await emailService.sendEmail({
      to: customer.email,
      subject: `Your DonClaudios sign-in code: ${code}`,
      text: `${greeting}\n\nYour DonClaudios code is ${code}. It expires in ${MFA_CODE_MINUTES} minutes.\n\nIf you didn't try to sign in, change your password.`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <p>${greeting}</p>
  <p>Your DonClaudios code is:</p>
  <p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#2d4a35;">${code}</p>
  <p style="color:#6b7280;">It expires in ${MFA_CODE_MINUTES} minutes. If you didn't try to sign in, change your password.</p>
</div>`
    });
    return {sentTo: maskEmail(customer.email), expiresMinutes: MFA_CODE_MINUTES};
  },

  /** Checks an emailed or authenticator-app code, or (when allowBackup) a one-time backup code. */
  async checkMfaCode(customerId: string, code: string, allowBackup: boolean) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    const mfa = customer.mfa;
    const input = String(code ?? '').trim().toLowerCase();

    // Backup codes look like "k7f2-9qhx-3m"; sign-in codes are 6 digits.
    if (allowBackup && mfa?.enabled && input.length > 6) {
      for (let i = 0; i < (mfa.backupCodes ?? []).length; i++) {
        if (await bcrypt.compare(input, mfa.backupCodes[i])) {
          const rest = mfa.backupCodes.filter((_, idx) => idx !== i);
          await CustomerModel.updateOne({_id: customerId}, {$set: {'mfa.backupCodes': rest}}).exec();
          return {customer, usedBackup: true, backupCodesLeft: rest.length};
        }
      }
      throw new ApiError(400, 'INVALID_CODE', 'That backup code is not valid.');
    }

    if (mfa?.enabled && mfa.method === 'totp' && mfa.totpSecret) {
      if ((mfa.codeAttempts ?? 0) >= MFA_MAX_ATTEMPTS * 2) {
        throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many wrong codes. Use a backup code, or try again later.');
      }
      const step = verifyTotp(decryptSecret(mfa.totpSecret), input, mfa.totpLastStep);
      if (step === null) {
        await CustomerModel.updateOne({_id: customerId}, {$inc: {'mfa.codeAttempts': 1}}).exec();
        throw new ApiError(400, 'INVALID_CODE', 'That code is not correct. Use the newest code in your authenticator app.');
      }
      await CustomerModel.updateOne(
        {_id: customerId},
        {$set: {'mfa.totpLastStep': step, 'mfa.codeAttempts': 0}}
      ).exec();
      return {customer, usedBackup: false, backupCodesLeft: mfa.backupCodes?.length ?? 0};
    }

    if (!mfa?.codeHash || !mfa.codeExpiry) {
      throw new ApiError(400, 'INVALID_CODE', 'Request a new code first.');
    }
    if ((mfa.codeAttempts ?? 0) >= MFA_MAX_ATTEMPTS) {
      throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many wrong codes. Request a new code.');
    }
    if (new Date(mfa.codeExpiry) < new Date()) {
      throw new ApiError(400, 'EXPIRED_CODE', 'That code expired. Request a new one.');
    }
    if (!(await bcrypt.compare(input, mfa.codeHash))) {
      await CustomerModel.updateOne({_id: customerId}, {$inc: {'mfa.codeAttempts': 1}}).exec();
      throw new ApiError(400, 'INVALID_CODE', 'That code is not correct.');
    }
    await CustomerModel.updateOne(
      {_id: customerId},
      {$set: {'mfa.codeHash': null, 'mfa.codeExpiry': null, 'mfa.codeAttempts': 0}}
    ).exec();
    return {customer, usedBackup: false, backupCodesLeft: mfa.backupCodes?.length ?? 0};
  },

  createChallenge(userId: string) {
    return jwt.sign({userId, type: 'customer', purpose: 'mfa'}, challengeSecret(), {expiresIn: '10m'});
  },

  readChallenge(token: string): string {
    try {
      const payload = jwt.verify(token, challengeSecret()) as {userId: string; purpose?: string};
      if (payload.purpose !== 'mfa') throw new Error('wrong purpose');
      return payload.userId;
    } catch {
      throw new ApiError(401, 'MFA_CHALLENGE_EXPIRED', 'Your sign-in took too long. Please sign in again.');
    }
  },

  async enableMfa(customerId: string, code: string) {
    const {customer} = await this.checkMfaCode(customerId, code, false);
    const codes = Array.from({length: BACKUP_CODE_COUNT}, newBackupCode);
    const hashes = await Promise.all(codes.map(c => bcrypt.hash(c, 10)));
    await CustomerModel.updateOne(
      {_id: customerId},
      {
        $set: {
          'mfa.enabled': true,
          'mfa.method': 'email',
          'mfa.backupCodes': hashes,
          'mfa.enabledAt': new Date(),
          'mfa.totpSecret': null,
          'mfa.totpPending': null
        }
      }
    ).exec();
    notify(customer, 'mfa_enabled');
    return {backupCodes: codes};
  },

  async disableMfa(customerId: string, code: string) {
    const {customer} = await this.checkMfaCode(customerId, code, true);
    await CustomerModel.updateOne(
      {_id: customerId},
      {
        $set: {
          'mfa.enabled': false,
          'mfa.method': 'email',
          'mfa.backupCodes': [],
          'mfa.enabledAt': null,
          'mfa.totpSecret': null,
          'mfa.totpPending': null,
          'mfa.totpLastStep': null,
          'mfa.codeAttempts': 0
        }
      }
    ).exec();
    notify(customer, 'mfa_disabled');
  }
};
