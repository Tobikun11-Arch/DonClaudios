import {SupportConversationModel} from '../models/SupportConversation.model';
import {SupportMessageModel} from '../models/SupportMessage.model';
import {SupportSpamLogModel} from '../models/SupportSpamLog.model';
import {ApiError} from '../utils/error';
import {scanText} from '../utils/profanityFilter';
import {toInternationalPhone} from '../utils/phone';
import {logger} from '../logging/logger';

/**
 * Spam / abuse protection for the support chat (mostly guests, who have no
 * account). Layers:
 *  - route rate limits (rateLimit.ts): messages per IP, chat starts per IP
 *  - honeypot on the guest identity form
 *  - guest name + contact must be real (PH mobile or email, no links / bad words)
 *  - max new guest chats per IP per day
 *  - message checks: bad words, links (guests), duplicates
 * Every block is written to support_spam_log.
 */

export const SUPPORT_GUARD = {
  /** New guest chats one IP may start in 24 hours. */
  guestChatsPerIpPerDay: 3,
  /** Same message text again in the same chat within this window = duplicate. */
  duplicateWindowMinutes: 2,
  nameMin: 2,
  nameMax: 60
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const EMAIL_ANYWHERE_RE = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi;
const LINK_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ph|xyz|io|info|biz|link|ly|me|co|app|site|online|shop|top|click|tk)\b)/i;

/** True when text contains a URL. Email addresses are not counted as links. */
export function containsLink(text: string) {
  return LINK_RE.test(text.replace(EMAIL_ANYWHERE_RE, ' '));
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

type LogCtx = {
  ip: string;
  customerType: 'guest' | 'account';
  conversationId?: unknown;
  guestSessionId?: string | null;
};

async function block(
  ctx: LogCtx,
  reason: string,
  status: number,
  message: string,
  preview = ''
): Promise<never> {
  logger.warn({ip: ctx.ip, reason}, 'support chat blocked');
  await SupportSpamLogModel.create({
    ip: ctx.ip,
    customerType: ctx.customerType,
    conversationId: (ctx.conversationId as any) ?? null,
    guestSessionId: ctx.guestSessionId ?? null,
    reason,
    preview: preview.slice(0, 200)
  }).catch(() => {});
  throw new ApiError(status, reason, message);
}

export const supportGuardService = {
  /** Guest "start chat" form: honeypot + real name + real contact. */
  async assertGuestIdentity(
    ctx: LogCtx,
    input: {name?: string; contact?: string; honeypot?: unknown}
  ) {
    if (typeof input.honeypot === 'string' && input.honeypot.trim()) {
      await block(ctx, 'SUPPORT_SPAM_DETECTED', 400, 'Unable to start the chat.');
    }

    const name = (input.name ?? '').trim();
    const contact = (input.contact ?? '').trim();
    const preview = `${name} | ${contact}`;

    if (name.length < SUPPORT_GUARD.nameMin || name.length > SUPPORT_GUARD.nameMax) {
      await block(
        ctx,
        'SUPPORT_INVALID_NAME',
        400,
        `Please enter your name (${SUPPORT_GUARD.nameMin}-${SUPPORT_GUARD.nameMax} characters).`,
        preview
      );
    }
    if (containsLink(name) || scanText(name).action !== 'allow') {
      await block(ctx, 'SUPPORT_INVALID_NAME', 400, 'Please enter your real name.', preview);
    }

    const isPhone = !!toInternationalPhone(contact);
    const isEmail = EMAIL_RE.test(contact);
    if (!isPhone && !isEmail) {
      await block(
        ctx,
        'SUPPORT_INVALID_CONTACT',
        400,
        'Please enter a valid PH mobile number (e.g. 09171234567) or email address so we can reach you.',
        preview
      );
    }
  },

  /** Limit how many brand-new guest chats one network can open per day. */
  async assertCanStartGuestChat(ctx: LogCtx) {
    const started = await SupportConversationModel.countDocuments({
      customerType: 'guest',
      createdIp: ctx.ip,
      createdAt: {$gte: minutesAgo(24 * 60)}
    });
    if (started >= SUPPORT_GUARD.guestChatsPerIpPerDay) {
      await block(
        ctx,
        'SUPPORT_CHAT_LIMIT',
        429,
        'Too many new chats from this network today. Please continue in your existing chat, or sign in to your account.'
      );
    }
  },

  /** Checks on every customer message before it is saved. */
  async assertMessageAllowed(ctx: LogCtx, body: string) {
    const text = body.trim();

    if (scanText(text).action === 'block') {
      await block(
        ctx,
        'PROFANITY_DETECTED',
        422,
        'Please remove inappropriate language before sending.',
        text
      );
    }

    if (ctx.customerType === 'guest' && containsLink(text)) {
      await block(
        ctx,
        'SUPPORT_LINK_BLOCKED',
        422,
        'Links are not allowed in guest messages. Please describe your concern in words, or sign in to your account.',
        text
      );
    }

    const duplicate = await SupportMessageModel.exists({
      conversationId: ctx.conversationId,
      senderType: 'customer',
      body: text,
      createdAt: {$gte: minutesAgo(SUPPORT_GUARD.duplicateWindowMinutes)}
    });
    if (duplicate) {
      await block(
        ctx,
        'SUPPORT_DUPLICATE_MESSAGE',
        409,
        'You already sent this message. We will get back to you soon.',
        text
      );
    }
  }
};
