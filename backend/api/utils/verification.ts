import {randomInt} from 'crypto';

/**
 * A 6-digit one-time code (100000–999999) from Node's cryptographically secure
 * random generator, so codes cannot be predicted like Math.random() output.
 * The upper bound of randomInt is exclusive, so the result is always 6 digits.
 */
export function generateVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

export function getVerificationExpiry(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
