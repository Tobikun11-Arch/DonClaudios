import {httpClient} from './httpClient';
import type {
  CreateReviewBody,
  CreateReviewResponse,
  ListReviewsResponse,
  ReplyReviewBody,
  ReplyReviewResponse,
  UpdateReviewStatusBody,
  UpdateReviewStatusResponse
} from '@/lib/types/review';

export async function listPublicReviews() {
  const res = await httpClient.get<ListReviewsResponse>('/reviews');
  return res.data;
}

export async function listMyReviews() {
  const res = await httpClient.get<ListReviewsResponse>('/reviews/my');
  return res.data;
}

export async function listAdminReviews() {
  const res = await httpClient.get<ListReviewsResponse>('/reviews/admin');
  return res.data;
}

export async function createReview(body: CreateReviewBody) {
  const res = await httpClient.post<CreateReviewResponse>('/reviews', body);
  return res.data;
}

export async function updateReviewStatus(params: {
  id: string;
  body: UpdateReviewStatusBody;
}) {
  const res = await httpClient.patch<UpdateReviewStatusResponse>(
    `/reviews/${params.id}/status`,
    params.body
  );
  return res.data;
}

export async function replyReview(params: {id: string; body: ReplyReviewBody}) {
  const res = await httpClient.post<ReplyReviewResponse>(
    `/reviews/${params.id}/reply`,
    params.body
  );
  return res.data;
}
