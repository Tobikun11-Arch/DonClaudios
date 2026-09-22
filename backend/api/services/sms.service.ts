import {env} from '../config/env';
import {ApiError} from '../utils/error';
import {toInternationalPhone} from '../utils/phone';

export const smsService = {
  async sendVerificationSms(params: {
    phoneNumber: string;
    code: string;
    expiresMinutes: number;
  }) {
    const token = env.IPROG_SMS_API_TOKEN;
    if (!token) {
      throw new ApiError(
        500,
        'SMS_NOT_CONFIGURED',
        'IPROG_SMS_API_TOKEN is not configured'
      );
    }

    const phoneNumber = toInternationalPhone(params.phoneNumber);
    if (!phoneNumber) {
      throw new ApiError(
        400,
        'INVALID_PHONE',
        'Invalid Philippine mobile number format'
      );
    }

    const message =
      `Your DonClaudios verification code is ${params.code}. ` +
      `It is valid for ${params.expiresMinutes} minutes. ` +
      'Do not share this code with anyone.';

    const url = `${env.IPROG_SMS_API_BASE_URL}/sms_messages`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          api_token: token,
          phone_number: phoneNumber,
          message,
          sms_provider: env.IPROG_SMS_PROVIDER
        })
      });
    } catch (error) {
      throw new ApiError(
        502,
        'SMS_NETWORK_ERROR',
        'Failed to reach the SMS provider'
      );
    }

    if (!response.ok) {
      throw new ApiError(
        502,
        'SMS_SEND_FAILED',
        `SMS send failed with status ${response.status}`
      );
    }

    return true;
  }
};

export type SmsService = typeof smsService;