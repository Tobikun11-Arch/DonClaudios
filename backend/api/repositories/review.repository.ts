import {OrderModel} from '../models/Order.model';
import {
  ReviewDocument,
  ReviewMessage,
  ReviewModel,
  ReviewStatus
} from '../models/Review.model';

export const reviewRepository = {
  findById: (id: string) => ReviewModel.findById(id).exec(),

  listApproved: () =>
    ReviewModel.find({status: 'approved'}).sort({createdAt: -1}).exec(),

  listAll: () => ReviewModel.find({}).sort({createdAt: -1}).exec(),

  listByCustomerId: (customerId: string) =>
    ReviewModel.find({customerId}).sort({createdAt: -1}).exec(),

  hasCompletedOrder: (customerId: string) =>
    OrderModel.exists({
      customerId,
      isGuest: false,
      orderStatus: 'completed'
    }).exec(),

  create: (data: Partial<ReviewDocument>) => ReviewModel.create(data),

  updateStatus: (id: string, status: ReviewStatus) =>
    ReviewModel.findByIdAndUpdate(id, {status}, {new: true}).exec(),

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
