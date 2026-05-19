import {z} from 'zod';

export const createCashierDto = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3),
  phoneNumber: z.string().min(1).optional(),
  address: z.string().min(1).optional()
});

export type CreateCashierDto = z.infer<typeof createCashierDto>;

export const updateCashierDto = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  username: z.string().min(3).optional(),
  phoneNumber: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  isOnline: z.boolean().optional(),
  isVerified: z.boolean().optional()
});

export type UpdateCashierDto = z.infer<typeof updateCashierDto>;
