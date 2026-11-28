import {Schema} from 'mongoose';

/** Optional two-step sign-in, shared by customers and the owner (admin). */
export interface AccountMfa {
  enabled: boolean;
  /** `email`: a code we email; `totp`: an authenticator app (Google Authenticator etc.). */
  method: 'email' | 'totp';
  /** Authenticator app secret, AES-GCM encrypted (see utils/totp.ts). */
  totpSecret?: string | null;
  /** Secret shown as a QR code while the user is setting the app up. */
  totpPending?: string | null;
  /** Last accepted 30-second step, so an app code can't be replayed. */
  totpLastStep?: number | null;
  /** bcrypt hashes of unused backup codes. */
  backupCodes: string[];
  enabledAt?: Date | null;
  /** Current sign-in / setup code (bcrypt hash), its expiry and tries. */
  codeHash?: string | null;
  codeExpiry?: Date | null;
  codeAttempts?: number;
  codeSentAt?: Date | null;
}

export const mfaField = {
  type: new Schema<AccountMfa>(
    {
      enabled: {type: Boolean, default: false},
      method: {type: String, enum: ['email', 'totp'], default: 'email'},
      totpSecret: {type: String, default: null},
      totpPending: {type: String, default: null},
      totpLastStep: {type: Number, default: null},
      backupCodes: {type: [String], default: []},
      enabledAt: {type: Date, default: null},
      codeHash: {type: String, default: null},
      codeExpiry: {type: Date, default: null},
      codeAttempts: {type: Number, default: 0},
      codeSentAt: {type: Date, default: null}
    },
    {_id: false}
  ),
  default: null
};
