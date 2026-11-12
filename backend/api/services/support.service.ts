import {ApiError} from '../utils/error';
import type {SupportConversationDocument} from '../models/SupportConversation.model';
import {supportConversationRepository} from '../repositories/supportConversation.repository';
import {supportMessageRepository} from '../repositories/supportMessage.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {settingsRepository} from '../repositories/settings.repository';
import {supportGuardService} from './supportGuard.service';
import {
  AUTO_REPLY_COOLDOWN_MINUTES,
  autoReplyFor,
  classifyInquiry,
  isInquiryCategory,
  type InquiryCategory
} from '../config/supportInquiry';

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Recompute a conversation's queue summary from its pending inquiries:
 * pending count, oldest waiting time, and whether any pending one is urgent.
 */
async function refreshInquirySummary(
  conversationId: string,
  latestCategory?: InquiryCategory
) {
  const pending =
    await supportMessageRepository.pendingInConversation(conversationId);
  return supportConversationRepository.setInquirySummary(conversationId, {
    ...(latestCategory ? {category: latestCategory} : {}),
    inquiryStatus: pending.length > 0 ? 'pending' : 'answered',
    priority: pending.some(m => m.priority === 'urgent') ? 'urgent' : 'normal',
    pendingSince: pending[0]?.createdAt ?? null,
    pendingCount: pending.length
  });
}

async function storePhone(): Promise<string | undefined> {
  try {
    const settings: any = await settingsRepository.findOne();
    const phones = settings?.contact?.phones;
    return Array.isArray(phones) && phones[0] ? String(phones[0]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Post an automatic acknowledgement after a customer inquiry. Skipped when the
 * same kind of auto-reply was already sent recently, unless this inquiry is
 * urgent and the last one was not (urgent always gets acknowledged).
 */
async function maybeSendAutoReply(
  conversationId: string,
  category: InquiryCategory,
  priority: 'urgent' | 'normal'
) {
  const last = await supportMessageRepository.lastSystemReply(conversationId);
  if (last) {
    const ageMin = (Date.now() - new Date(last.createdAt).getTime()) / 60000;
    const lastWasUrgent = last.priority === 'urgent';
    const escalated = priority === 'urgent' && !lastWasUrgent;
    if (ageMin < AUTO_REPLY_COOLDOWN_MINUTES && !escalated) return null;
  }
  return supportMessageRepository.create({
    conversationId: conversationId as any,
    senderType: 'system',
    senderName: 'Auto-reply',
    body: autoReplyFor(category, priority, priority === 'urgent' ? await storePhone() : undefined),
    // Stored so the next check knows whether the last auto-reply was urgent.
    priority,
    category
  });
}

/** How far back an urgent message keeps a chat visible to cashiers. */
const URGENT_CASHIER_WINDOW_MS = 24 * 60 * 60 * 1000;

async function assertCashierMayView(conversationId: string) {
  const ok = await supportMessageRepository.hasUrgentSince(
    conversationId,
    new Date(Date.now() - URGENT_CASHIER_WINDOW_MS)
  );
  if (!ok) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Cashiers can only open urgent support chats.'
    );
  }
}

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
    /** Hidden honeypot field from the guest form (must be empty). */
    honeypot?: unknown;
    ip: string;
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

    // Guests: the name / contact they type must be real, and the honeypot
    // empty. Checked whenever they submit the form (new or existing chat).
    const guestCtx = {
      ip: data.ip,
      customerType: 'guest' as const,
      conversationId: conversation?._id ?? null,
      guestSessionId: data.guestSessionId ?? null
    };
    if (!data.customerId && (data.guestName || data.guestContact || !conversation)) {
      await supportGuardService.assertGuestIdentity(guestCtx, {
        name: data.guestName,
        contact: data.guestContact,
        honeypot: data.honeypot
      });
    }

    if (conversation) {
      if (conversation.status === 'closed') {
        conversation = (await supportConversationRepository.reopen(
          String(conversation._id)
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
        createdIp: data.ip,
        lastMessageAt: new Date()
      });
    }

    // Brand-new guest chat: cap how many one network can open per day.
    await supportGuardService.assertCanStartGuestChat(guestCtx);

    return supportConversationRepository.create({
      customerType: 'guest',
      guestSessionId: data.guestSessionId,
      guestName: data.guestName?.trim(),
      guestContact: data.guestContact?.trim(),
      status: 'open',
      createdIp: data.ip,
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
    await supportMessageRepository.markReadForCustomer(
      String(conversation._id)
    );
    return messages;
  },

  async sendByCustomer(
    conversationId: string,
    body: string,
    data: {customerId?: string; guestSessionId?: string; ip: string},
    chosenCategory?: unknown
  ) {
    if (!isNonEmptyString(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Message is required');
    }
    if (body.trim().length > MAX_MESSAGE_LENGTH) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
      );
    }
    const conversation = await getConversationOrThrow(conversationId);
    assertCanAccess(
      conversation,
      data.customerId,
      data.guestSessionId
    );

    const senderName = await customerNameFor(conversation);
    const convId = String(conversation._id);

    // Spam checks: bad words, links (guests), duplicates.
    await supportGuardService.assertMessageAllowed(
      {
        ip: data.ip,
        customerType: conversation.customerType,
        conversationId: conversation._id,
        guestSessionId: conversation.guestSessionId ?? null
      },
      body
    );

    // Log this message as an inquiry: type + priority + pending status.
    const inquiry = classifyInquiry(body, chosenCategory);

    const message = await supportMessageRepository.create({
      conversationId: conversation._id as any,
      senderType: 'customer',
      senderName: senderName || 'Customer',
      body: body.trim(),
      category: inquiry.category,
      priority: inquiry.priority,
      inquiryStatus: 'pending',
      autoFlagged: inquiry.autoFlagged,
      matchedKeywords: inquiry.matchedKeywords
    });

    if (conversation.status === 'closed') {
      await supportConversationRepository.reopen(convId);
    }
    await supportConversationRepository.updateLastMessageAt(convId);
    await refreshInquirySummary(convId, inquiry.category);

    let autoReply = null;
    try {
      autoReply = await maybeSendAutoReply(
        convId,
        inquiry.category,
        inquiry.priority
      );
    } catch (error) {
      console.error('Failed to send support auto-reply', error);
    }

    // No bell notification for the owner: the Inquiry Queue bubble already
    // shows the unread count and pulses red for urgent inquiries.

    return {message, autoReply};
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
        category: conv.category ?? 'general',
        priority: conv.priority ?? 'normal',
        inquiryStatus: conv.inquiryStatus ?? 'answered',
        pendingSince: conv.pendingSince ?? null,
        pendingCount: conv.pendingCount ?? 0,
        closedBy: conv.closedBy ?? null,
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

  // ---- Cashier: urgent inquiries only ------------------------------------
  // Cashiers see and answer conversations that had an URGENT customer message
  // in the last 24 hours (wrong / missing order, allergy, late order...), so
  // the person at the counter can act fast. Everything else stays owner-only.

  async listUrgentForCashier() {
    const ids = new Set(
      (
        await supportMessageRepository.conversationIdsWithUrgentSince(
          new Date(Date.now() - URGENT_CASHIER_WINDOW_MS)
        )
      ).map(String)
    );
    if (ids.size === 0) return [];
    const all = await this.listForOwner();
    return all.filter(c => ids.has(String(c._id)));
  },

  async listMessagesForCashier(conversationId: string) {
    const conversation = await getConversationOrThrow(conversationId);
    await assertCashierMayView(String(conversation._id));
    // Not marked read: the owner's unread badge must still show it.
    return supportMessageRepository.listByConversationId(
      String(conversation._id)
    );
  },

  async sendByCashier(cashierId: string, conversationId: string, body: string) {
    await assertCashierMayView(conversationId);
    const cashier = await cashierRepository.findById(cashierId);
    const name = cashier ? fullName(cashier.firstName, cashier.lastName) : '';
    return this.sendByOwner(null, conversationId, body, name || 'Cashier');
  },

  async sendByOwner(
    adminId: string | null,
    conversationId: string,
    body: string,
    staffName?: string
  ) {
    if (!isNonEmptyString(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Message is required');
    }
    const conversation = await getConversationOrThrow(conversationId);

    let senderName = staffName ?? '';
    if (!staffName && adminId) {
      const admin = await adminRepository.findById(adminId);
      senderName = admin ? fullName(admin.firstName, admin.lastName) : '';
    }

    // senderType 'owner' = store staff (owner or cashier); the customer sees
    // "DonClaudio's", staff see senderName.
    const message = await supportMessageRepository.create({
      conversationId: conversation._id as any,
      senderType: 'owner',
      senderName: senderName || "DonClaudio's Team",
      body: body.trim()
    });

    await supportConversationRepository.updateLastMessageAt(
      String(conversation._id)
    );

    // Replying answers every pending inquiry in this conversation. answeredAt
    // minus createdAt is the response time shown in the queue stats.
    await supportMessageRepository.markConversationAnswered(
      String(conversation._id),
      'reply'
    );
    await refreshInquirySummary(String(conversation._id));

    if (conversation.status === 'closed') {
      await supportConversationRepository.reopen(String(conversation._id));
    }

    // No bell notification for the customer: the support chat bubble already
    // shows an unread badge for new replies.

    return message;
  },

  async closeForOwner(conversationId: string) {
    const conversation = await getConversationOrThrow(conversationId);
    // Resolving clears the queue entry (no response time recorded: 'manual').
    await supportMessageRepository.markConversationAnswered(
      String(conversation._id),
      'manual'
    );
    await refreshInquirySummary(String(conversation._id));
    return supportConversationRepository.close(
      String(conversation._id),
      'owner'
    );
  },

  /**
   * Owner marks a conversation's pending inquiries as answered without typing
   * a chat reply (e.g. they called the customer back).
   */
  async markAnsweredByOwner(conversationId: string) {
    const conversation = await getConversationOrThrow(conversationId);
    await supportMessageRepository.markConversationAnswered(
      String(conversation._id),
      'manual'
    );
    return refreshInquirySummary(String(conversation._id));
  },

  /** Inquiry log: every customer message with its type, priority and status. */
  async listInquiryLog(filters: {
    status?: unknown;
    category?: unknown;
    priority?: unknown;
    limit?: unknown;
  }) {
    const query: Record<string, unknown> = {};
    if (
      filters.status === 'pending' ||
      filters.status === 'answered' ||
      filters.status === 'customer_closed'
    ) {
      query.inquiryStatus = filters.status;
    }
    if (isInquiryCategory(filters.category)) query.category = filters.category;
    if (filters.priority === 'urgent' || filters.priority === 'normal') {
      query.priority = filters.priority;
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 300);

    const rows = await supportMessageRepository.listInquiries(query, limit);
    const convIds = [...new Set(rows.map(r => String(r.conversationId)))];
    const convs = convIds.length
      ? await supportConversationRepository.listByIds(convIds)
      : [];
    const convById = new Map(convs.map(c => [String(c._id), c]));

    const inquiries = rows.map(r => {
      const conv = convById.get(String(r.conversationId));
      return {
        _id: r._id,
        conversationId: r.conversationId,
        customerType: conv?.customerType ?? 'guest',
        senderName: r.senderName,
        body: r.body,
        category: r.category ?? 'general',
        priority: r.priority ?? 'normal',
        inquiryStatus: r.inquiryStatus ?? 'pending',
        autoFlagged: !!r.autoFlagged,
        matchedKeywords: r.matchedKeywords ?? [],
        createdAt: r.createdAt,
        answeredAt: r.answeredAt ?? null,
        answeredVia: r.answeredVia ?? null,
        responseMinutes:
          r.answeredAt && r.answeredVia === 'reply'
            ? Math.round(
                (new Date(r.answeredAt).getTime() -
                  new Date(r.createdAt).getTime()) /
                  60000
              )
            : null
      };
    });

    // Queue order: pending first, urgent before normal, oldest waiting first;
    // answered ones after, newest first.
    inquiries.sort((a, b) => {
      const ap = a.inquiryStatus === 'pending' ? 0 : 1;
      const bp = b.inquiryStatus === 'pending' ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (ap === 0) {
        const au = a.priority === 'urgent' ? 0 : 1;
        const bu = b.priority === 'urgent' ? 0 : 1;
        if (au !== bu) return au - bu;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return inquiries;
  },

  /** Numbers for the queue header (pending, urgent, avg response time). */
  async getQueueStats(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [statsRows, byCategoryRows] = await Promise.all([
      supportMessageRepository.inquiryStats(since),
      supportMessageRepository.pendingByCategory()
    ]);
    const s = statsRows[0] ?? {};
    const toMin = (ms: unknown) =>
      typeof ms === 'number' ? Math.round(ms / 60000) : null;

    const pendingByCategory: Record<string, {count: number; urgent: number}> = {};
    let pending = 0;
    let urgentPending = 0;
    for (const row of byCategoryRows) {
      pendingByCategory[row._id ?? 'general'] = {
        count: row.count,
        urgent: row.urgent
      };
      pending += row.count;
      urgentPending += row.urgent;
    }

    return {
      rangeDays: days,
      pending,
      urgentPending,
      pendingByCategory,
      received: s.total ?? 0,
      answered: s.answered ?? 0,
      customerClosed: s.customerClosed ?? 0,
      urgentReceived: s.urgent ?? 0,
      autoFlagged: s.autoFlagged ?? 0,
      avgResponseMinutes: toMin(s.avgResponseMs),
      avgUrgentResponseMinutes: toMin(s.avgUrgentResponseMs),
      avgNormalResponseMinutes: toMin(s.avgNormalResponseMs)
    };
  },

  async closeByCustomer(
    conversationId: string,
    data: {customerId?: string; guestSessionId?: string}
  ) {
    const conversation = await getConversationOrThrow(conversationId);
    assertCanAccess(
      conversation,
      data.customerId,
      data.guestSessionId
    );
    // "I'm all set": normal waiting messages are logged as closed by the
    // customer (NOT as answered, so the stats stay honest). Urgent ones stay
    // pending in the owner's queue until staff actually respond.
    await supportMessageRepository.markConversationCustomerClosed(
      String(conversation._id)
    );
    await refreshInquirySummary(String(conversation._id));
    return supportConversationRepository.close(
      String(conversation._id),
      'customer'
    );
  }
};