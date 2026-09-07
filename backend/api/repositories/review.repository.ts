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

  getUnreviewedCompletedOrders: async (customerId: string) => {
    const [orders, reviewed] = await Promise.all([
      OrderModel.find({customerId, isGuest: false, orderStatus: 'completed'})
        .sort({createdAt: 1})
        .exec(),
      ReviewModel.find({customerId, orderId: {$ne: null}})
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
