import {env} from '../config/env';
import {ApiError} from '../utils/error';
import {toInternationalPhone} from '../utils/phone';
import {
  generateVerificationCode,
  getVerificationExpiry
} from '../utils/verification';
import {guestVerificationRepository} from '../repositories/guestVerification.repository';
import {smsService} from './sms.service';

const CODE_EXPIRY_MINUTES = env.GUEST_OTP_CODE_MINUTES;
const VERIFIED_DAYS = env.GUEST_OTP_VERIFIED_DAYS;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 5;

function normalizeOrThrow(phoneNumber: string) {
  const normalized = toInternationalPhone(phoneNumber);
  if (!normalized) {
    throw new ApiError(
      400,
      'INVALID_PHONE',
      'Invalid Philippine mobile number format'
    );
  }
  return normalized;
}

export const guestOtpService = {
  async sendOtp(phoneNumber: string) {
    const normalized = normalizeOrThrow(phoneNumber);
    const existing = await guestVerificationRepository.findByPhone(normalized);

    if (
      existing &&
      existing.verified &&
      existing.verifiedExpiry &&
      existing.verifiedExpiry > new Date()
    ) {
      return {alreadyVerified: true};
    }

    if (existing?.lastSentAt) {
      const waitMs =
        RESEND_COOLDOWN_MS -
        (Date.now() - new Date(existing.lastSentAt).getTime());
      if (waitMs > 0) {
        throw new ApiError(
          429,
          'RESEND_COOLDOWN',
          `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code`
        );
      }
    }

    if (existing && existing.resendCount >= MAX_RESENDS) {
      throw new ApiError(
        429,
        'RESEND_LIMIT',
        'Too many code requests. Please try again later.'
      );
    }

    const code = generateVerificationCode();
    const expiry = getVerificationExpiry(CODE_EXPIRY_MINUTES);

    await guestVerificationRepository.upsertCode(normalized, code, expiry);

    try {
      await smsService.sendVerificationSms({
        phoneNumber: normalized,
        code,
        expiresMinutes: CODE_EXPIRY_MINUTES
      });
    } catch (error) {
      throw error;
    }

    return {sent: true};
  },

  async verifyOtp(phoneNumber: string, code: string) {
    const normalized = normalizeOrThrow(phoneNumber);
    const rec = await guestVerificationRepository.findByPhone(normalized);

    if (!rec || !rec.verificationCode || !rec.verificationExpiry) {
      throw new ApiError(
        400,
        'INVALID_CODE',
        'No verification code requested for this number'
      );
    }

    if (rec.verificationExpiry < new Date()) {
      await guestVerificationRepository.invalidateCode(normalized);
      throw new ApiError(
        400,
        'EXPIRED_CODE',
        'Verification code expired. Please request a new one.'
      );
    }

    const attemptsUsed = (rec.attempts ?? 0) + 1;

    if (rec.verificationCode !== code) {
      if (attemptsUsed >= MAX_ATTEMPTS) {
        await guestVerificationRepository.invalidateCode(normalized);
        throw new ApiError(
          429,
          'ATTEMPT_LIMIT',
          'Too many incorrect attempts. Please request a new code.'
        );
      }
      await guestVerificationRepository.incrementAttempts(normalized);
      throw new ApiError(
        400,
        'INVALID_CODE',
        `Incorrect code. ${MAX_ATTEMPTS - attemptsUsed} attempt(s) remaining.`
      );
    }

    const verifiedExpiry = new Date(
      Date.now() + VERIFIED_DAYS * 24 * 60 * 60 * 1000
    );
    await guestVerificationRepository.markVerified(normalized, verifiedExpiry);

    return {verified: true};
  },

  async isPhoneVerified(phoneNumber: string) {
    const normalized = toInternationalPhone(phoneNumber);
    if (!normalized) return false;
    const rec = await guestVerificationRepository.findByPhone(normalized);
    return !!(
      rec &&
      rec.verified === true &&
      rec.verifiedExpiry &&
      rec.verifiedExpiry > new Date()
    );
  }
};