import {
  SupportMessageDocument,
  SupportMessageModel
} from '../models/SupportMessage.model';

const responseMs = (extra: Record<string, unknown>[] = []) => ({
  $avg: {
    $cond: [
      {
        $and: [
          {$ne: ['$answeredAt', null]},
          {$eq: ['$answeredVia', 'reply']},
          ...extra
        ]
      },
      {$subtract: ['$answeredAt', '$createdAt']},
      null
    ]
  }
});

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

  /** Owner + system messages the customer has not seen yet. */
  markReadForCustomer: (conversationId: string) =>
    SupportMessageModel.updateMany(
      {conversationId, senderType: {$in: ['owner', 'system']}, readAt: null},
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
      {$match: {senderType: {$ne: 'system'}}},
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
    ]).exec(),

  /** Mark every pending inquiry in a conversation as answered. */
  markConversationAnswered: (
    conversationId: string,
    via: 'reply' | 'manual'
  ) =>
    SupportMessageModel.updateMany(
      {conversationId, senderType: 'customer', inquiryStatus: 'pending'},
      {inquiryStatus: 'answered', answeredAt: new Date(), answeredVia: via}
    ).exec(),

  /** Customer said "I'm all set": close their normal (non-urgent) inquiries. */
  markConversationCustomerClosed: (conversationId: string) =>
    SupportMessageModel.updateMany(
      {
        conversationId,
        senderType: 'customer',
        inquiryStatus: 'pending',
        priority: {$ne: 'urgent'}
      },
      {inquiryStatus: 'customer_closed'}
    ).exec(),

  pendingInConversation: (conversationId: string) =>
    SupportMessageModel.find({
      conversationId,
      senderType: 'customer',
      inquiryStatus: 'pending'
    })
      .sort({createdAt: 1})
      .lean()
      .exec(),

  /** Conversations with an urgent customer message since `since`. */
  conversationIdsWithUrgentSince: (since: Date) =>
    SupportMessageModel.distinct('conversationId', {
      senderType: 'customer',
      priority: 'urgent',
      createdAt: {$gte: since}
    }).exec(),

  hasUrgentSince: async (conversationId: string, since: Date) =>
    !!(await SupportMessageModel.exists({
      conversationId,
      senderType: 'customer',
      priority: 'urgent',
      createdAt: {$gte: since}
    })),

  lastSystemReply: (conversationId: string) =>
    SupportMessageModel.findOne({conversationId, senderType: 'system'})
      .sort({createdAt: -1})
      .lean()
      .exec(),

  /** The inquiry log: customer messages, newest first. */
  listInquiries: (filter: Record<string, unknown>, limit: number) =>
    SupportMessageModel.find({
      senderType: 'customer',
      inquiryStatus: {$ne: null},
      ...filter
    })
      .sort({createdAt: -1})
      .limit(limit)
      .lean()
      .exec(),

  /** Queue stats over customer inquiries received since `since`. */
  inquiryStats: (since: Date) =>
    SupportMessageModel.aggregate([
      {
        $match: {
          senderType: 'customer',
          inquiryStatus: {$ne: null},
          createdAt: {$gte: since}
        }
      },
      {
        $group: {
          _id: null,
          total: {$sum: 1},
          answered: {
            $sum: {$cond: [{$eq: ['$inquiryStatus', 'answered']}, 1, 0]}
          },
          customerClosed: {
            $sum: {$cond: [{$eq: ['$inquiryStatus', 'customer_closed']}, 1, 0]}
          },
          urgent: {$sum: {$cond: [{$eq: ['$priority', 'urgent']}, 1, 0]}},
          autoFlagged: {$sum: {$cond: ['$autoFlagged', 1, 0]}},
          avgResponseMs: responseMs(),
          avgUrgentResponseMs: responseMs([{$eq: ['$priority', 'urgent']}]),
          avgNormalResponseMs: responseMs([{$eq: ['$priority', 'normal']}])
        }
      }
    ]).exec(),

  pendingByCategory: () =>
    SupportMessageModel.aggregate([
      {$match: {senderType: 'customer', inquiryStatus: 'pending'}},
      {
        $group: {
          _id: '$category',
          count: {$sum: 1},
          urgent: {$sum: {$cond: [{$eq: ['$priority', 'urgent']}, 1, 0]}}
        }
      }
    ]).exec()
};
