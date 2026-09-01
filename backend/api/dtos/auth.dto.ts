import {z} from 'zod';

export const registerDto = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().min(1).optional(),
  address: z.string().min(1).optional()
});

export const verifyDto = z.object({
  email: z.string().email(),
  code: z.string().length(6) // always 6 digits from generateVerificationCode()
});

export const resendVerificationDto = z.object({
  email: z.string().email()
});

export const loginDto = z.object({
  email: z.string().min(1),
  password: z.string().min(8)
});

export const refreshDto = z.object({
  refreshToken: z.string().min(1).optional()
});

export const forgotPasswordDto = z.object({
  email: z.string().email()
});

export const resetPasswordDto = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8)
});

export const updateProfileDto = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  profilePhoto: z.string().min(1).optional(),
  businessName: z.string().min(1).optional(),
  businessLogo: z.string().min(1).optional(),
  storeAddress: z.string().min(1).optional(),
  businessContactNumber: z.string().min(1).optional(),
  operatingHours: z.string().min(1).optional(),
  businessType: z.string().min(1).optional(),
  address: z.string().min(1).optional()
});

export const changePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export type RegisterDto = z.infer<typeof registerDto>;
export type VerifyDto = z.infer<typeof verifyDto>;
export type ResendVerificationDto = z.infer<typeof resendVerificationDto>;
export type LoginDto = z.infer<typeof loginDto>;
export type RefreshDto = z.infer<typeof refreshDto>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDto>;
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;
export type ChangePasswordDto = z.infer<typeof changePasswordDto>;
