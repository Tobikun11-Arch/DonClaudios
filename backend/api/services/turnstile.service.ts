import {env} from '../config/env';
import {logger} from '../logging/logger';
import {ApiError} from '../utils/error';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

let warnedDisabled = false;

/**
 * Cloudflare Turnstile check for order placement. Skipped (logged once) while
 * TURNSTILE_SECRET_KEY is empty, so local dev and the current deploy keep
 * working until the keys are added. Fails closed: if Cloudflare cannot be
 * reached the order is refused and the customer can retry.
 */
export async function verifyTurnstile(token: unknown, ip: string) {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      logger.warn('TURNSTILE_SECRET_KEY is empty; CAPTCHA check skipped');
    }
    return;
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    throw new ApiError(
      400,
      'CAPTCHA_REQUIRED',
      'Please complete the security check before placing your order.'
    );
  }

  const body = new URLSearchParams({secret, response: token});
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  let result: {success?: boolean; 'error-codes'?: string[]};
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000)
    });
    result = (await res.json()) as typeof result;
  } catch (err) {
    logger.error({err}, 'turnstile siteverify failed');
    throw new ApiError(
      503,
      'CAPTCHA_UNAVAILABLE',
      'We could not run the security check. Please try again in a moment.'
    );
  }

  if (!result.success) {
    logger.warn(
      {ip, errors: result['error-codes']},
      'turnstile verification rejected'
    );
    throw new ApiError(
      400,
      'CAPTCHA_FAILED',
      'The security check failed or expired. Please try again.'
    );
  }
}
