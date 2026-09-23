import {z} from 'zod';

export const guestOtpSendDto = z.object({
  phoneNumber: z.string().min(1)
});

export const guestOtpVerifyDto = z.object({
  phoneNumber: z.string().min(1),
  code: z.string().length(6)
});

export type GuestOtpSendDto = z.infer<typeof guestOtpSendDto>;
export type GuestOtpVerifyDto = z.infer<typeof guestOtpVerifyDto>;