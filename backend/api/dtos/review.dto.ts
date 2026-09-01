import {z} from 'zod';

export const createReviewDto = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000)
});

export type CreateReviewDto = z.infer<typeof createReviewDto>;

export const updateReviewStatusDto = z.object({
  status: z.enum(['pending', 'approved', 'rejected'])
});

export type UpdateReviewStatusDto = z.infer<typeof updateReviewStatusDto>;

export const replyReviewDto = z.object({
  reply: z.string().min(1).max(2000)
});

export type ReplyReviewDto = z.infer<typeof replyReviewDto>;
