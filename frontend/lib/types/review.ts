export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewAuthorType = 'customer' | 'admin';

export interface ReviewMessage {
  _id: string;
  authorType: ReviewAuthorType;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface ReviewImage {
  url: string;
  alt?: string;
}

export interface Review {
  _id: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  orderId?: string | null;
  images?: ReviewImage[];
  reply?: string | null;
  replyDate?: string | null;
  messages: ReviewMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEligibility {
  eligible: boolean;
  remainingCount: number;
}

export interface ReviewEligibilityResponse {
  eligible: boolean;
  remainingCount: number;
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
  images?: string[];
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
