// Inquiry types for the support chat. Keep ids identical to
// backend/api/config/supportInquiry.ts (the backend classifies and enforces).

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
/** customer_closed = customer said "I'm all set" before staff replied. */
export type InquiryStatus = 'pending' | 'answered' | 'customer_closed';

export const INQUIRY_META: Record<
  InquiryCategory,
  {label: string; emoji: string; hint: string; chip: string}
> = {
  urgent: {
    label: 'Urgent',
    emoji: '🚨',
    hint: 'Wrong/missing item, late order, allergy, payment problem',
    chip: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30'
  },
  order: {
    label: 'Order',
    emoji: '🧾',
    hint: 'Status, pickup, delivery or changes to an order',
    chip: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
  },
  pre_order: {
    label: 'Pre-order',
    emoji: '📅',
    hint: 'Whole lechon, events, reserving ahead',
    chip: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
  },
  payment: {
    label: 'Payment',
    emoji: '💳',
    hint: 'GCash, Maya, card, cash, receipts',
    chip: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  },
  feedback: {
    label: 'Feedback',
    emoji: '💬',
    hint: 'Suggestions, compliments, complaints',
    chip: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30'
  },
  general: {
    label: 'General',
    emoji: '❓',
    hint: 'Anything else',
    chip: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/50 dark:text-gray-200 dark:border-gray-600'
  }
};

export function inquiryLabel(c?: string | null) {
  const meta = INQUIRY_META[(c as InquiryCategory) ?? 'general'] ?? INQUIRY_META.general;
  return `${meta.emoji} ${meta.label}`;
}

export function inquiryChipClass(c?: string | null) {
  return (INQUIRY_META[(c as InquiryCategory) ?? 'general'] ?? INQUIRY_META.general).chip;
}

/** "3m", "1h 20m", "2d" */
export function formatWait(fromIso: string | Date, to: number = Date.now()) {
  const mins = Math.max(0, Math.floor((to - new Date(fromIso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

export function formatMinutes(mins: number | null | undefined) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}
