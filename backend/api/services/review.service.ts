import {ApiError} from '../utils/error';
import {reviewRepository} from '../repositories/review.repository';
import {customerRepository} from '../repositories/customer.repository';
import {emailService} from './email.service';
import {reviewReplyEmailTemplate} from '../templates/reviewReplyEmail';
import type {CustomerDocument} from '../models/Customer.model';

export const reviewService = {
  async listPublic() {
    return reviewRepository.listApproved();
  },

  async listForAdmin() {
    return reviewRepository.listAll();
  },

  async listMyReviews(customerId: string) {
    return reviewRepository.listByCustomerId(customerId);
  },

  async createById(customerId: string, data: {rating: number; comment: string}) {
    if (!data.comment.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Comment is required');
    }

    const hasOrder = await reviewRepository.hasCompletedOrder(customerId);
    if (!hasOrder) {
      throw new ApiError(
        403,
        'REVIEW_NOT_ELIGIBLE',
        'You need at least one completed order to leave a review.'
      );
    }

    const customer = (await customerRepository.findById(customerId)) as
      | (CustomerDocument & {_id: unknown})
      | null;
    if (!customer) {
      throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    const customerName = [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return reviewRepository.create({
      customerId: customer._id as any,
      customerName: customerName || 'Customer',
      rating: data.rating,
      comment: data.comment
    });
  },

  async updateStatusById(reviewId: string, status: 'pending' | 'approved' | 'rejected') {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    if (status !== 'approved' && status !== 'rejected') {
      throw new ApiError(400, 'INVALID_STATUS', 'Status must be approved or rejected');
    }

    const updated = await reviewRepository.updateStatus(reviewId, status);
    return updated;
  },

  async replyToReview(
    reviewId: string,
    adminId: string,
    reply: string
  ) {
    if (!reply.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Reply is required');
    }

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    const updated = await reviewRepository.addReply(reviewId, reply, adminId);

    const customer = (await customerRepository.findById(
      String(review.customerId)
    )) as (CustomerDocument & {_id: unknown}) | null;

    if (customer) {
      try {
        const {subject, text, html} = reviewReplyEmailTemplate({
          recipientName: customer.firstName,
          reply
        });
        await emailService.sendEmail({to: customer.email, subject, text, html});
      } catch (error) {
        console.error('Failed to send review reply email', error);
      }
    }

    return updated;
  }
};
