import dotenv from 'dotenv';
import {z} from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  // APPWRITE_ENDPOINT: z.string().min(1), - to be followed
  // APPWRITE_PROJECT_ID: z.string().min(1),
  // APPWRITE_API_KEY: z.string().min(1),
  // APPWRITE_BUCKET_ID: z.string().min(1),
  // REDIS_URL: z.string().min(1),
  // FCM_KEY: z.string().min(1), if needed
  IPROG_SMS_API_TOKEN: z.string().min(1).optional(),
  IPROG_SMS_API_BASE_URL: z
    .string()
    .url()
    .default('https://www.iprogsms.com/api/v1')
    .optional(),
  IPROG_SMS_PROVIDER: z.coerce.number().int().default(2),
  GUEST_OTP_CODE_MINUTES: z.coerce.number().int().min(1).default(5),
  GUEST_OTP_VERIFIED_DAYS: z.coerce.number().int().min(1).default(30),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = {
  ...parsed.data,
  PORT: parsed.data.PORT ? Number(parsed.data.PORT) : 5000
};
