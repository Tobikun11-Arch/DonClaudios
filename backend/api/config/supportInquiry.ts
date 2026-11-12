// Support inquiry queue configuration.
//
// Problem addressed (capstone paper): "Difficulty in identifying urgent
// messages among regular inquiries". Every customer chat message is logged as
// an INQUIRY with a type (category), a priority and a status
// (pending -> answered). Urgent inquiries are flagged both by the customer's
// own choice AND automatically by keyword detection, and are always sorted to
// the top of the owner's queue.
//
// Keep the category ids identical to frontend/lib/support/inquiry.ts.

export const INQUIRY_CATEGORIES = [
  'urgent',
  'order',
  'pre_order',
  'payment',
  'feedback',
  'general'
] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export type InquiryPriority = 'urgent' | 'normal';
// 'customer_closed' = the customer said "I'm all set" before staff replied.
// Kept separate from 'answered' so the stats only count real staff answers.
export type InquiryStatus = 'pending' | 'answered' | 'customer_closed';

export const INQUIRY_LABELS: Record<InquiryCategory, string> = {
  urgent: 'Urgent',
  order: 'Order concern',
  pre_order: 'Pre-order',
  payment: 'Payment',
  feedback: 'Feedback',
  general: 'General inquiry'
};

export function isInquiryCategory(v: unknown): v is InquiryCategory {
  return (
    typeof v === 'string' &&
    (INQUIRY_CATEGORIES as readonly string[]).includes(v)
  );
}

/**
 * Words that mark a message as urgent no matter which type the customer picked
 * (English + Filipino). Matched case-insensitively as whole words / phrases.
 */
export const URGENT_KEYWORDS = [
  'urgent',
  'asap',
  'emergency',
  'right now',
  'immediately',
  'wrong order',
  'wrong item',
  'missing',
  'not arrived',
  'not delivered',
  "hasn't arrived",
  'still waiting',
  'very late',
  'cancel my order',
  'refund',
  'charged twice',
  'double charge',
  'allergy',
  'allergic',
  'food poisoning',
  'sick',
  'spoiled',
  'rotten',
  // Filipino / Taglish
  'agad',
  'ngayon na',
  'mali ang order',
  'maling order',
  'kulang',
  'hindi dumating',
  'di dumating',
  'wala pa',
  'ang tagal',
  'matagal na',
  'panis',
  'sira',
  'nalason',
  'sumakit tiyan',
  'ibalik ang bayad'
];

/** Light keyword hints used only when the customer left the type as General. */
const CATEGORY_HINTS: Array<{category: InquiryCategory; words: string[]}> = [
  {
    category: 'pre_order',
    words: ['pre-order', 'preorder', 'pre order', 'advance order', 'reserve', 'reservation', 'whole lechon', 'event']
  },
  {
    category: 'payment',
    words: ['gcash', 'maya', 'payment', 'paid', 'pay ', 'bayad', 'receipt', 'down payment', 'card']
  },
  {
    category: 'order',
    words: ['my order', 'order ko', 'yung order', 'order namin', 'order #', 'order number', 'tracking', 'delivery', 'pickup', 'pick-up', 'rider', 'lalamove', 'status']
  },
  {
    category: 'feedback',
    words: ['feedback', 'suggestion', 'thank you', 'thanks', 'salamat', 'masarap', 'delicious', 'complaint']
  }
];

function containsPhrase(text: string, phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

export function detectUrgentKeywords(text: string): string[] {
  return URGENT_KEYWORDS.filter(k => containsPhrase(text, k));
}

export function suggestCategory(text: string): InquiryCategory | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const hint of CATEGORY_HINTS) {
    if (hint.words.some(w => lower.includes(w))) return hint.category;
  }
  return null;
}

/**
 * Classify one customer message.
 * - The customer's chosen type wins, except that urgent keywords always raise
 *   the priority to urgent (autoFlagged = true when the system did it).
 * - If the customer left it as General, keyword hints may pick a better type.
 */
export function classifyInquiry(body: string, chosen?: unknown) {
  const picked: InquiryCategory = isInquiryCategory(chosen) ? chosen : 'general';
  const urgentHits = detectUrgentKeywords(body);

  let category: InquiryCategory = picked;
  if (picked === 'general') {
    category = suggestCategory(body) ?? 'general';
  }

  const customerSaidUrgent = picked === 'urgent';
  const priority: InquiryPriority =
    customerSaidUrgent || urgentHits.length > 0 ? 'urgent' : 'normal';

  return {
    category,
    priority,
    autoFlagged: !customerSaidUrgent && urgentHits.length > 0,
    matchedKeywords: urgentHits
  };
}

/** Do not repeat the same auto-reply within this window. */
export const AUTO_REPLY_COOLDOWN_MINUTES = 30;

export function autoReplyFor(
  category: InquiryCategory,
  priority: InquiryPriority,
  storePhone?: string
): string {
  const call = storePhone ? ` For immediate help you may also call us at ${storePhone}.` : '';
  if (priority === 'urgent') {
    return (
      'We received your message and marked it as URGENT. It is now at the top of our inquiry queue and a staff member will respond as soon as possible.' +
      call
    );
  }
  switch (category) {
    case 'order':
      return 'Thanks! Your order concern is in our queue. To help us faster, please include your order number (the 6-character code on your confirmation, e.g. #A1B2C3).';
    case 'pre_order':
      return 'Thanks for your pre-order inquiry! Please share the date, time, size or quantity you need. Pre-orders are available to signed-in customers.';
    case 'payment':
      return 'Thanks! Your payment concern is in our queue. Please include your order number and the payment method you used (GCash, Maya, card or cash).';
    case 'feedback':
      return 'Thank you for your feedback! We read every message and will get back to you if needed.';
    case 'general':
    default:
      return 'Thanks for reaching out! Your inquiry is in our queue and we will reply shortly. You can also check the FAQs in this chat for quick answers.';
  }
}
