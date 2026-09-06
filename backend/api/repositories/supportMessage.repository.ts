import {
  SupportMessageDocument,
  SupportMessageModel
} from '../models/SupportMessage.model';

export const supportMessageRepository = {
  listByConversationId: (conversationId: string) =>
    SupportMessageModel.find({conversationId})
      .sort({createdAt: 1})
      .exec(),

  create: (data: Partial<SupportMessageDocument>) =>
    SupportMessageModel.create(data),

  markReadForSender: (conversationId: string, senderType: string) =>
    SupportMessageModel.updateMany(
      {conversationId, senderType, readAt: null},
      {readAt: new Date()}
    ).exec(),

  unreadCountByConversation: (conversationId: string, senderType: string) =>
    SupportMessageModel.countDocuments({
      conversationId,
      senderType,
      readAt: null
    }).exec(),

  listConversationSummaries: () =>
    SupportMessageModel.aggregate([
      {$sort: {createdAt: 1}},
      {
        $group: {
          _id: '$conversationId',
          lastMessageAt: {$last: '$createdAt'},
          lastMessage: {$last: '$body'},
          lastSender: {$last: '$senderName'},
          count: {$sum: 1}
        }
      },
      {$sort: {lastMessageAt: -1}}
    ]).exec(),

  unreadCountsByConversation: () =>
    SupportMessageModel.aggregate([
      {$match: {senderType: 'customer', readAt: null}},
      {
        $group: {
          _id: '$conversationId',
          count: {$sum: 1}
        }
      }
    ]).exec()
};