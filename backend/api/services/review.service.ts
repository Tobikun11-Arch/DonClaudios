import {ApiError} from '../utils/error';
import {reviewRepository} from '../repositories/review.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {emailService} from './email.service';
import {notificationService} from './notification.service';
import {reviewReplyEmailTemplate} from '../templates/reviewReplyEmail';
import type {CustomerDocument} from '../models/Customer.model';
import type {AdminDocument} from '../models/Admin.model';

export const reviewService = {
  async listPublic() {
    const reviews = await reviewRepository.listApproved();
    return reviews.map(review => {
      const obj = review.toObject();
      const customer = obj.customerId as
        | {_id?: unknown; profilePhoto?: string}
        | null
        | undefined;
      const isPopulated =
        customer && typeof customer === 'object' && !Array.isArray(customer);
      const profilePhoto = isPopulated
        ? (customer as {profilePhoto?: string}).profilePhoto ?? null
        : null;
      return {
        ...obj,
        profilePhoto,
        customerId: isPopulated
          ? String((customer as {_id?: unknown})._id)
          : String(obj.customerId)
      };
    });
  },

  async listForAdmin() {
    return reviewRepository.listAll();
  },

  async listMyReviews(customerId: string) {
    return reviewRepository.listByCustomerId(customerId);
  },

  async getEligibility(customerId: string) {
    const unreviewedOrders = await reviewRepository.getUnreviewedCompletedOrders(
      customerId
    );
    return {
      eligible: unreviewedOrders.length > 0,
      remainingCount: unreviewedOrders.length
    };
  },

  async createById(
    customerId: string,
    data: {rating: number; comment: string; images?: string[]}
  ) {
    if (!data.comment.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Comment is required');
    }

    const images = (data.images ?? [])
      .map(url => ({url, alt: ''}))
      .slice(0, 3);

    const unreviewedOrders = await reviewRepository.getUnreviewedCompletedOrders(
      customerId
    );
    if (unreviewedOrders.length === 0) {
      throw new ApiError(
        403,
        'REVIEW_NOT_ELIGIBLE',
        'You can only leave one review per completed order.'
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

    const targetOrder = unreviewedOrders[0];

    let created;
    try {
      created = await reviewRepository.create({
        customerId: customer._id as any,
        customerName: customerName || 'Customer',
        rating: data.rating,
        comment: data.comment,
        orderId: targetOrder._id as any,
        images
      });
    } catch (error) {
      const isDuplicate = (error as {code?: number})?.code === 11000;
      if (isDuplicate) {
        throw new ApiError(
          403,
          'REVIEW_NOT_ELIGIBLE',
          'This order has already been reviewed.'
        );
      }
      throw error;
    }

    try {
      const admins = (await adminRepository.listAll()) as
        | (AdminDocument & {_id: unknown})[]
        | null;
      for (const admin of admins ?? []) {
        try {
          await notificationService.createForAdmin({
            adminId: String(admin._id),
            type: 'review_submitted',
            title: 'New review awaiting approval',
            message: `${customerName} submitted a ${data.rating}-star review.`,
            reviewId: String(created._id),
            link: '/owner/dashboard?tab=reviews'
          });
        } catch (error) {
          console.error('Failed to create review notification for admin', error);
        }
      }
    } catch (error) {
      console.error('Failed to notify admins about new review', error);
    }

    return created;
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

    const admin = (await adminRepository.findById(adminId)) as
      | (AdminDocument & {_id: unknown})
      | null;
    const senderName = admin
      ? [admin.firstName, admin.lastName].filter(Boolean).join(' ')
      : "DonClaudio's Team";

    await reviewRepository.addMessage(reviewId, {
      authorType: 'admin',
      senderName: senderName || "DonClaudio's Team",
      body: reply.trim(),
      createdAt: new Date()
    });

    const updated = await reviewRepository.addReply(reviewId, reply.trim(), adminId);

    const customer = (await customerRepository.findById(
      String(review.customerId)
    )) as (CustomerDocument & {_id: unknown}) | null;

    if (customer) {
      try {
        await notificationService.createForCustomer({
          customerId: String(review.customerId),
          type: 'review_reply',
          title: 'Reply to your review',
          message: reply,
          reviewId: reviewId,
          link: '/customer/dashboard?tab=reviews'
        });
      } catch (error) {
        console.error('Failed to create review reply notification', error);
      }

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
  },

  async replyByCustomer(
    reviewId: string,
    customerId: string,
    reply: string
  ) {
    if (!reply.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Reply is required');
    }

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    if (String(review.customerId) !== String(customerId)) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only reply to your own review');
    }

    const customer = (await customerRepository.findById(customerId)) as
      | (CustomerDocument & {_id: unknown})
      | null;
    const senderName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
      : 'Customer';

    const updated = await reviewRepository.addMessage(reviewId, {
      authorType: 'customer',
      senderName: senderName || 'Customer',
      body: reply.trim(),
      createdAt: new Date()
    });

    try {
      const admins = (await adminRepository.listAll()) as
        | (AdminDocument & {_id: unknown})[]
        | null;
      for (const admin of admins ?? []) {
        try {
          await notificationService.createForAdmin({
            adminId: String(admin._id),
            type: 'review_submitted',
            title: 'Customer replied to a review',
            message: `${senderName} replied: "${reply.trim()}"`,
            reviewId: reviewId,
            link: '/owner/dashboard?tab=reviews'
          });
        } catch (error) {
          console.error('Failed to create review reply notification for admin', error);
        }
      }
    } catch (error) {
      console.error('Failed to notify admins about customer reply', error);
    }

    return updated;
  }
};
