import {
  OrderMessageDocument,
  OrderMessageModel
} from '../models/OrderMessage.model';

export const orderMessageRepository = {
  listByOrderId: (orderId: string) =>
    OrderMessageModel.find({orderId}).sort({createdAt: 1}).exec(),

  listOrderSummaries: () =>
    OrderMessageModel.aggregate([
      {$sort: {createdAt: 1}},
      {
        $group: {
          _id: '$orderId',
          lastMessageAt: {$last: '$createdAt'},
          lastMessage: {$last: '$body'},
          lastSender: {$last: '$senderName'},
          count: {$sum: 1}
        }
      },
      {$sort: {lastMessageAt: -1}}
    ]).exec(),

  create: (data: Partial<OrderMessageDocument>) =>
    OrderMessageModel.create(data)
};
