import {ApiError} from '../utils/error';
import type {SupportConversationDocument} from '../models/SupportConversation.model';
import {supportConversationRepository} from '../repositories/supportConversation.repository';
import {supportMessageRepository} from '../repositories/supportMessage.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {notificationService} from './notification.service';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

async function getConversationOrThrow(id: string) {
  const conversation = await supportConversationRepository.findById(id);
  if (!conversation) {
    throw new ApiError(
      404,
      'CONVERSATION_NOT_FOUND',
      'Conversation not found'
    );
  }
  return conversation;
}

function assertCanAccess(
  conversation: SupportConversationDocument,
  customerId?: string | null,
  guestSessionId?: string | null
) {
  if (
    customerId &&
    conversation.customerId &&
    String(conversation.customerId) === customerId
  ) {
    return;
  }
  if (
    conversation.customerType === 'guest' &&
    guestSessionId &&
    conversation.guestSessionId === guestSessionId
  ) {
    return;
  }
  throw new ApiError(
    403,
    'FORBIDDEN',
    'You can only access your own support conversation'
  );
}

async function customerNameFor(conversation: SupportConversationDocument) {
  if (conversation.customerType === 'guest') {
    return conversation.guestName || 'Guest';
  }
  if (conversation.customerId) {
    const customer = await customerRepository.findById(
      String(conversation.customerId)
    );
    if (customer) {
      return fullName(customer.firstName, customer.lastName) || 'Customer';
    }
  }
  return 'Customer';
}

export const supportService = {
  async getOrCreateConversation(data: {
    customerId?: string;
    guestSessionId?: string;
    guestName?: string;
    guestContact?: string;
  }) {
    if (!data.customerId && !data.guestSessionId) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Customer identity is required'
      );
    }

    let conversation: SupportConversationDocument | null = null;
    if (data.customerId) {
      conversation =
        await supportConversationRepository.findMostRecentByCustomerId(
          data.customerId
        );
    } else {
      conversation =
        await supportConversationRepository.findMostRecentByGuestSessionId(
          data.guestSessionId as string
        );
    }

    if (conversation) {
      if (conversation.status === 'closed') {
        conversation = (await supportConversationRepository.updateStatus(
          String(conversation._id),
          'open'
        )) as SupportConversationDocument | null;
      }
      if (!data.customerId && (data.guestName || data.guestContact)) {
        if (conversation) {
          if (data.guestName) conversation.guestName = data.guestName;
          if (data.guestContact) conversation.guestContact = data.guestContact;
          await conversation.save();
        }
      }
      if (conversation) return conversation;
    }

    if (data.customerId) {
      return supportConversationRepository.create({
        customerId: data.customerId as any,
        customerType: 'account',
        status: 'open',
        lastMessageAt: new Date()
      });
    }

    return supportConversationRepository.create({
      customerType: 'guest',
      guestSessionId: data.guestSessionId,
      guestName: data.guestName,
      guestContact: data.guestContact,
      status: 'open',
      lastMessageAt: new Date()
    });
  },

  async getMyConversation(data: {
    customerId?: string;
    guestSessionId?: string;
  }) {
    let conversation: SupportConversationDocument | null = null;
    if (data.customerId) {
      conversation =
        await supportConversationRepository.findMostRecentByCustomerId(
          data.customerId
        );
    } else if (data.guestSessionId) {
      conversation =
        await supportConversationRepository.findMostRecentByGuestSessionId(
          data.guestSessionId
        );
    }
    if (!conversation) {
      return {conversation: null, unreadCount: 0};
    }
    const unreadCount =
      await supportMessageRepository.unreadCountByConversation(
        String(conversation._id),
        'owner'
      );
    return {conversation, unreadCount};
  },

  async listMessages(
    conversationId: string,
    data: {customerId?: string; guestSessionId?: string}
  ) {
    const conversation = await getConversationOrThrow(conversationId);
    assertCanAccess(
      conversation,
      data.customerId,
      data.guestSessionId
    );
    const messages = await supportMessageRepository.listByConversationId(
      String(conversation._id)
    );
    await supportMessageRepository.markReadForSender(
      String(conversation._id),
      'owner'
    );
    return messages;
  },

  async sendByCustomer(
    conversationId: string,
    body: string,
    data: {customerId?: string; guestSessionId?: string}
  ) {
    if (!isNonEmptyString(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Message is required');
    }
    const conversation = await getConversationOrThrow(conversationId);
    assertCanAccess(
      conversation,
      data.customerId,
      data.guestSessionId
    );

    const senderName = await customerNameFor(conversation);

    const message = await supportMessageRepository.create({
      conversationId: conversation._id as any,
      senderType: 'customer',
      senderName: senderName || 'Customer',
      body: body.trim()
    });

    if (conversation.status === 'closed') {
      await supportConversationRepository.updateStatus(
        String(conversation._id),
        'open'
      );
    }
    await supportConversationRepository.updateLastMessageAt(
      String(conversation._id)
    );

    try {
      const admins = await adminRepository.listAll();
      for (const admin of admins ?? []) {
        try {
          await notificationService.createForAdmin({
            adminId: String(admin._id),
            type: 'support_message',
            title: 'New support message',
            message: `${senderName || 'Customer'}: "${body.trim()}"`,
            link: '/owner/dashboard?tab=support'
          });
        } catch (error) {
          console.error(
            'Failed to create support message admin notification',
            error
          );
        }
      }
    } catch (error) {
      console.error('Failed to notify admins about support message', error);
    }

    return message;
  },

  async listForOwner() {
    const conversations =
      await supportConversationRepository.listAll();
    const summaries =
      await supportMessageRepository.listConversationSummaries();
    const unreadRows =
      await supportMessageRepository.unreadCountsByConversation();

    const summaryByConv = new Map(
      summaries.map(s => [String(s._id), s])
    );
    const unreadByConv = new Map(
      unreadRows.map(u => [String(u._id), u.count])
    );

    const customerIds = conversations
      .filter(c => c.customerType === 'account' && c.customerId)
      .map(c => String(c.customerId));
    const customers = customerIds.length
      ? await customerRepository.listByIds(customerIds)
      : [];
    const customerById = new Map(
      customers.map(c => [String(c._id), c])
    );

    return conversations.map(conv => {
      const summary = summaryByConv.get(String(conv._id));
      const customer = conv.customerId
        ? customerById.get(String(conv.customerId))
        : undefined;
      const displayName =
        conv.customerType === 'account'
          ? customer
            ? fullName(customer.firstName, customer.lastName) || 'Customer'
            : 'Customer'
          : conv.guestName
            ? `Guest: ${conv.guestName}`
            : 'Guest';
      const contact =
        conv.customerType === 'account'
          ? customer?.phoneNumber ?? ''
          : conv.guestContact ?? '';

      return {
        _id: conv._id,
        customerType: conv.customerType,
        status: conv.status,
        lastMessageAt:
          conv.lastMessageAt || summary?.lastMessageAt || conv.createdAt,
        createdAt: conv.createdAt,
        displayName,
        contact,
        lastMessage: summary?.lastMessage ?? '',
        lastSender: summary?.lastSender ?? '',
        unreadCount: unreadByConv.get(String(conv._id)) ?? 0
      };
    });
  },

  async listMessagesForOwner(conversationId: string) {
    const conversation = await getConversationOrThrow(conversationId);
    const messages = await supportMessageRepository.listByConversationId(
      String(conversation._id)
    );
    await supportMessageRepository.markReadForSender(
      String(conversation._id),
      'customer'
    );
    return messages;
  },

  async sendByOwner(adminId: string, conversationId: string, body: string) {
    if (!isNonEmptyString(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Message is required');
    }
    const conversation = await getConversationOrThrow(conversationId);

    const admin = await adminRepository.findById(adminId);
    const senderName = admin
      ? fullName(admin.firstName, admin.lastName)
      : '';

    const message = await supportMessageRepository.create({
      conversationId: conversation._id as any,
      senderType: 'owner',
      senderName: senderName || "DonClaudio's Team",
      body: body.trim()
    });

    await supportConversationRepository.updateLastMessageAt(
      String(conversation._id)
    );

    if (conversation.customerId) {
      try {
        await notificationService.createForCustomer({
          customerId: String(conversation.customerId),
          type: 'support_message',
          title: "DonClaudio's replied",
          message: `"${body.trim()}"`,
          link: '/customer/dashboard?openSupport=1'
        });
      } catch (error) {
        console.error(
          'Failed to create support reply customer notification',
          error
        );
      }
    }

    return message;
  },

  async closeForOwner(conversationId: string) {
    const conversation = await getConversationOrThrow(conversationId);
    return supportConversationRepository.updateStatus(
      String(conversation._id),
      'closed'
    );
  }
};