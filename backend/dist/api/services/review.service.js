"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewService = void 0;
const error_1 = require("../utils/error");
const review_repository_1 = require("../repositories/review.repository");
const customer_repository_1 = require("../repositories/customer.repository");
const admin_repository_1 = require("../repositories/admin.repository");
const email_service_1 = require("./email.service");
const notification_service_1 = require("./notification.service");
const reviewReplyEmail_1 = require("../templates/reviewReplyEmail");
exports.reviewService = {
    async listPublic() {
        return review_repository_1.reviewRepository.listApproved();
    },
    async listForAdmin() {
        return review_repository_1.reviewRepository.listAll();
    },
    async listMyReviews(customerId) {
        return review_repository_1.reviewRepository.listByCustomerId(customerId);
    },
    async createById(customerId, data) {
        if (!data.comment.trim()) {
            throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'Comment is required');
        }
        const hasOrder = await review_repository_1.reviewRepository.hasCompletedOrder(customerId);
        if (!hasOrder) {
            throw new error_1.ApiError(403, 'REVIEW_NOT_ELIGIBLE', 'You need at least one completed order to leave a review.');
        }
        const customer = (await customer_repository_1.customerRepository.findById(customerId));
        if (!customer) {
            throw new error_1.ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
        }
        const customerName = [customer.firstName, customer.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
        const created = await review_repository_1.reviewRepository.create({
            customerId: customer._id,
            customerName: customerName || 'Customer',
            rating: data.rating,
            comment: data.comment
        });
        try {
            const admins = (await admin_repository_1.adminRepository.listAll());
            for (const admin of admins ?? []) {
                try {
                    await notification_service_1.notificationService.createForAdmin({
                        adminId: String(admin._id),
                        type: 'review_submitted',
                        title: 'New review awaiting approval',
                        message: `${customerName} submitted a ${data.rating}-star review.`,
                        reviewId: String(created._id),
                        link: '/owner/dashboard?tab=reviews'
                    });
                }
                catch (error) {
                    console.error('Failed to create review notification for admin', error);
                }
            }
        }
        catch (error) {
            console.error('Failed to notify admins about new review', error);
        }
        return created;
    },
    async updateStatusById(reviewId, status) {
        const review = await review_repository_1.reviewRepository.findById(reviewId);
        if (!review) {
            throw new error_1.ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
        }
        if (status !== 'approved' && status !== 'rejected') {
            throw new error_1.ApiError(400, 'INVALID_STATUS', 'Status must be approved or rejected');
        }
        const updated = await review_repository_1.reviewRepository.updateStatus(reviewId, status);
        return updated;
    },
    async replyToReview(reviewId, adminId, reply) {
        if (!reply.trim()) {
            throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'Reply is required');
        }
        const review = await review_repository_1.reviewRepository.findById(reviewId);
        if (!review) {
            throw new error_1.ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
        }
        const admin = (await admin_repository_1.adminRepository.findById(adminId));
        const senderName = admin
            ? [admin.firstName, admin.lastName].filter(Boolean).join(' ')
            : "DonClaudio's Team";
        await review_repository_1.reviewRepository.addMessage(reviewId, {
            authorType: 'admin',
            senderName: senderName || "DonClaudio's Team",
            body: reply.trim(),
            createdAt: new Date()
        });
        const updated = await review_repository_1.reviewRepository.addReply(reviewId, reply.trim(), adminId);
        const customer = (await customer_repository_1.customerRepository.findById(String(review.customerId)));
        if (customer) {
            try {
                await notification_service_1.notificationService.createForCustomer({
                    customerId: String(review.customerId),
                    type: 'review_reply',
                    title: 'Reply to your review',
                    message: reply,
                    reviewId: reviewId,
                    link: '/customer/dashboard?tab=reviews'
                });
            }
            catch (error) {
                console.error('Failed to create review reply notification', error);
            }
            try {
                const { subject, text, html } = (0, reviewReplyEmail_1.reviewReplyEmailTemplate)({
                    recipientName: customer.firstName,
                    reply
                });
                await email_service_1.emailService.sendEmail({ to: customer.email, subject, text, html });
            }
            catch (error) {
                console.error('Failed to send review reply email', error);
            }
        }
        return updated;
    },
    async replyByCustomer(reviewId, customerId, reply) {
        if (!reply.trim()) {
            throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'Reply is required');
        }
        const review = await review_repository_1.reviewRepository.findById(reviewId);
        if (!review) {
            throw new error_1.ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
        }
        if (String(review.customerId) !== String(customerId)) {
            throw new error_1.ApiError(403, 'FORBIDDEN', 'You can only reply to your own review');
        }
        const customer = (await customer_repository_1.customerRepository.findById(customerId));
        const senderName = customer
            ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
            : 'Customer';
        const updated = await review_repository_1.reviewRepository.addMessage(reviewId, {
            authorType: 'customer',
            senderName: senderName || 'Customer',
            body: reply.trim(),
            createdAt: new Date()
        });
        try {
            const admins = (await admin_repository_1.adminRepository.listAll());
            for (const admin of admins ?? []) {
                try {
                    await notification_service_1.notificationService.createForAdmin({
                        adminId: String(admin._id),
                        type: 'review_submitted',
                        title: 'Customer replied to a review',
                        message: `${senderName} replied: "${reply.trim()}"`,
                        reviewId: reviewId,
                        link: '/owner/dashboard?tab=reviews'
                    });
                }
                catch (error) {
                    console.error('Failed to create review reply notification for admin', error);
                }
            }
        }
        catch (error) {
            console.error('Failed to notify admins about customer reply', error);
        }
        return updated;
    }
};
