import {
  SupportConversationDocument,
  SupportConversationModel
} from '../models/SupportConversation.model';

export const supportConversationRepository = {
  findById: (id: string) =>
    SupportConversationModel.findById(id).exec(),

  findMostRecentByGuestSessionId: (guestSessionId: string) =>
    SupportConversationModel.findOne({guestSessionId})
      .sort({createdAt: -1})
      .exec(),

  findMostRecentByCustomerId: (customerId: string) =>
    SupportConversationModel.findOne({customerId})
      .sort({createdAt: -1})
      .exec(),

  findByGuestSessionId: (guestSessionId: string) =>
    SupportConversationModel.find({guestSessionId})
      .sort({createdAt: -1})
      .exec(),

  findByCustomerId: (customerId: string) =>
    SupportConversationModel.find({customerId})
      .sort({createdAt: -1})
      .exec(),

  listAll: () =>
    SupportConversationModel.find({}).sort({lastMessageAt: -1}).exec(),

  create: (data: Partial<SupportConversationDocument>) =>
    SupportConversationModel.create(data),

  updateLastMessageAt: (id: string) =>
    SupportConversationModel.findByIdAndUpdate(
      id,
      {lastMessageAt: new Date()},
      {new: true}
    ).exec(),

  updateStatus: (id: string, status: 'open' | 'closed') =>
    SupportConversationModel.findByIdAndUpdate(
      id,
      {status},
      {new: true}
    ).exec()
};