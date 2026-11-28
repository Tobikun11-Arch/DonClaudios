import {ApiError} from '../utils/error';
import {maskText, scanText} from '../utils/profanityFilter';
import {reviewRepository} from '../repositories/review.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {emailService} from './email.service';
import {notificationService} from './notification.service';
import {reviewReplyEmailTemplate} from '../templates/reviewReplyEmail';
import type {CustomerDocument} from '../models/Customer.model';
import type {AdminDocument} from '../models/Admin.model';

// Card #228: reviews publish on submit. Only 1-star reviews wait for the owner
// (approve/reject as a dispute check). Bad words are never blocked; the stored
// text stays original for the owner and is masked whenever it is shown publicly.
const NEEDS_OWNER_REVIEW_MAX_RATING = 1;

export const reviewService = {
  async listPublic() {
    const reviews = await reviewRepository.listApproved();
    return reviews.map(review => {
      const {
        moderation: _moderation,
        moderatedBy: _moderatedBy,
        repliedBy: _repliedBy,
        isAutoRejected: _isAutoRejected,
        ...obj
      } = review.toObject();
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
        comment: maskText(obj.comment),
        reply: obj.reply ? maskText(obj.reply) : obj.reply,
        messages: (obj.messages ?? []).map(message => ({
          ...message,
          body: maskText(message.body)
        })),
        profilePhoto,
        customerId: isPopulated
          ? String((customer as {_id?: unknown})._id)
          : String(obj.customerId)
      };
    });
  },

  async listForAdmin() {
    const reviews = await reviewRepository.listAll();
    // The owner sees the original text (needed for disputes) plus the masked
    // version the homepage shows.
    return reviews.map(review => {
      const obj = review.toObject();
      return {...obj, publicComment: maskText(obj.comment)};
    });
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

    // Bad words are not blocked: the original is stored and masked on public
    // reads. The matched words are kept on the record for the owner.
    const scan = scanText(data.comment);
    const needsOwnerReview = data.rating <= NEEDS_OWNER_REVIEW_MAX_RATING;

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

    // Reviews auto-rejected under the old word filter do not consume the
    // order's slot, so clear one before storing the resubmission (keeps the
    // {customerId, orderId} unique index satisfied).
    try {
      await reviewRepository.deleteAutoRejectedForOrder(
        customerId,
        String(targetOrder._id)
      );
    } catch (error) {
      console.error('Failed to clear previous auto-rejected review', error);
    }

    let created;
    try {
      created = await reviewRepository.create({
        customerId: customer._id as any,
        customerName: customerName || 'Customer',
        rating: data.rating,
        comment: data.comment,
        orderId: targetOrder._id as any,
        images,
        status: needsOwnerReview ? 'pending' : 'approved',
        isAutoRejected: false,
        moderation: {
          action: 'allow',
          score: scan.score,
          matchedWords: scan.terms
        }
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
            title: needsOwnerReview
              ? '1-star review needs your decision'
              : 'New review published',
            message: needsOwnerReview
              ? `${customerName || 'A customer'} left a 1-star review. It stays hidden until you approve or reject it.`
              : `${customerName || 'A customer'} posted a ${data.rating}-star review. It is live on the homepage.`,
            reviewId: String(created._id),
            link: '/owner/dashboard?tab=reviews',
            preferenceKey: 'customers.New reviews'
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

  async updateStatusById(
    reviewId: string,
    status: 'pending' | 'approved' | 'rejected',
    actorId?: string
  ) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    if (status !== 'approved' && status !== 'rejected') {
      throw new ApiError(400, 'INVALID_STATUS', 'Status must be approved or rejected');
    }

    // Approve/reject only exists for reviews waiting on the owner (1-star, plus
    // any legacy pending review from before auto-publish).
    if (review.status !== 'pending') {
      throw new ApiError(
        409,
        'REVIEW_ALREADY_DECIDED',
        'Only reviews waiting for your decision can be approved or rejected.'
      );
    }

    return reviewRepository.updateStatus(
      reviewId,
      status,
      actorId
        ? {action: 'manual', isAutoRejected: false, moderatedBy: actorId as any}
        : undefined
    );
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
            link: '/owner/dashboard?tab=reviews',
            preferenceKey: 'customers.Customer replies'
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
