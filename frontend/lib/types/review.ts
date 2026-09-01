export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewAuthorType = 'customer' | 'admin';

export interface ReviewMessage {
  _id: string;
  authorType: ReviewAuthorType;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  reply?: string | null;
  replyDate?: string | null;
  messages: ReviewMessage[];
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

export interface ReplyReviewByCustomerBody {
  reply: string;
}

export interface ReplyReviewByCustomerResponse {
  review: Review;
}
