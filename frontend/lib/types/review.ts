export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  _id: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  reply?: string | null;
  replyDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListReviewsResponse {
  reviews: Review[];
}

export interface GetReviewResponse {
  review: Review;
}

export interface CreateReviewResponse {
  review: Review;
}

export interface CreateReviewBody {
  rating: number;
  comment: string;
}

export interface UpdateReviewStatusResponse {
  review: Review;
}

export interface UpdateReviewStatusBody {
  status: ReviewStatus;
}

export interface ReplyReviewResponse {
  review: Review;
}

export interface ReplyReviewBody {
  reply: string;
}
