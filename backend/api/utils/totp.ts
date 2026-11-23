import {createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual} from 'crypto';
import {env} from '../config/env';

/**
 * Authenticator-app codes (TOTP, RFC 6238): the 6-digit codes Google
 * Authenticator, Microsoft Authenticator, Authy etc. show every 30 seconds.
 * SHA-1, 6 digits, 30 s steps — the defaults every app supports.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
/** Accept the previous and next code too, for phone clocks that drift a little. */
const DRIFT_STEPS = 1;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New random secret (160 bits), base32 as the apps expect. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * The time step the code belongs to, or null. Steps at or before `lastUsedStep`
 * are refused, so a code can't be replayed.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep?: number | null, now = Date.now()): number | null {
  const input = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(input)) return null;
  const step = currentStep(now);
  for (let d = -DRIFT_STEPS; d <= DRIFT_STEPS; d++) {
    const s = step + d;
    if (lastUsedStep != null && s <= lastUsedStep) continue;
    const expected = Buffer.from(totpCode(secret, s));
    if (timingSafeEqual(expected, Buffer.from(input))) return s;
  }
  return null;
}

/** otpauth:// link the apps read from the QR code. */
export function otpauthUrl(secret: string, accountName: string, issuer = "DonClaudio's") {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS)
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* Secrets are stored encrypted (AES-256-GCM), never as plain text. */

function key() {
  return createHash('sha256').update(`${env.JWT_SECRET}:totp-secret`).digest();
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.');
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored.split('.').map(p => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
