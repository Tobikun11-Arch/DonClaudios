import mongoose from 'mongoose';
import {OrderModel} from '../models/Order.model';
import {
  ReviewDocument,
  ReviewMessage,
  ReviewModel,
  ReviewModerationAction,
  ReviewStatus
} from '../models/Review.model';

export const reviewRepository = {
  findById: (id: string) => ReviewModel.findById(id).exec(),

listApproved: () =>
    ReviewModel.find({status: 'approved'})
      .sort({createdAt: -1})
      .populate('customerId', 'profilePhoto')
      .exec(),

  listAll: () => ReviewModel.find({}).sort({createdAt: -1}).exec(),

  listByCustomerId: (customerId: string) =>
    ReviewModel.find({customerId}).sort({createdAt: -1}).exec(),

  getUnreviewedCompletedOrders: async (customerId: string) => {
    const [orders, reviewed] = await Promise.all([
      OrderModel.find({customerId, isGuest: false, orderStatus: 'completed'})
        .sort({createdAt: 1})
        .exec(),
      // $ne true also matches legacy reviews saved before moderation existed,
      // which have no isAutoRejected field at all.
      ReviewModel.find({
        customerId,
        orderId: {$ne: null},
        isAutoRejected: {$ne: true}
      })
        .select('orderId')
        .exec()
    ]);
    const reviewedIds = new Set(
      reviewed
        .map(review => review.orderId)
        .filter((id): id is NonNullable<typeof id> => id != null)
        .map(String)
    );
    return orders.filter(order => !reviewedIds.has(String(order._id)));
  },

  // An auto-rejected review must not burn the customer's one-review-per-order
  // slot, so it is cleared before the resubmission is stored. This also keeps
  // the {customerId, orderId} unique index satisfied.
  deleteAutoRejectedForOrder: (customerId: string, orderId: string) =>
    ReviewModel.deleteOne({customerId, orderId, isAutoRejected: true}).exec(),

  create: (data: Partial<ReviewDocument>) => ReviewModel.create(data),

  updateStatus: (
    id: string,
    status: ReviewStatus,
    moderation?: {
      action: ReviewModerationAction;
      isAutoRejected?: boolean;
      moderatedBy: mongoose.Types.ObjectId;
    }
  ) =>
    ReviewModel.findByIdAndUpdate(
      id,
      {
        status,
        isAutoRejected: moderation?.isAutoRejected ?? false,
        moderatedAt: new Date(),
        ...(moderation
          ? {
              moderatedBy: moderation.moderatedBy,
              'moderation.action': moderation.action
            }
          : {moderatedBy: null})
      },
      {new: true}
    ).exec(),

  addReply: (id: string, reply: string, adminId: string) =>
    ReviewModel.findByIdAndUpdate(
      id,
      {reply, replyDate: new Date(), repliedBy: adminId},
      {new: true}
    ).exec(),

  addMessage: (id: string, message: ReviewMessage) =>
    ReviewModel.findByIdAndUpdate(
      id,
      {$push: {messages: message}},
      {new: true}
    ).exec()
};
