import type {InquiryCategory} from './inquiry';
import {GUEST_MAX_ORDER_TOTAL, MIN_ORDER_TOTAL} from '@/lib/constants/orderLimits';

// Common questions answered instantly inside the support chat, so customers
// get an answer without waiting and the owner's queue only holds questions
// that really need a person. Answers reflect the system's real rules.

export type SupportFaq = {
  id: string;
  question: string;
  answer: string;
  /** Inquiry type pre-selected if the customer still wants to message us. */
  category: InquiryCategory;
};

const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: 'track',
    question: 'How do I track my order?',
    answer:
      'Open the link in your order confirmation email, or go to "Track Order" on our website and enter your tracking number. Signed-in customers can also see live status under Order History in their dashboard.',
    category: 'order'
  },
  {
    id: 'limits',
    question: 'Is there a minimum or maximum order?',
    answer: `The minimum online order is ${peso(MIN_ORDER_TOTAL)}. Guest orders can be up to ${peso(GUEST_MAX_ORDER_TOTAL)}; sign up for a free account to place larger orders.`,
    category: 'order'
  },
  {
    id: 'pay',
    question: 'What payment methods do you accept?',
    answer:
      'Once our cashier confirms your order, you can pay online with GCash, Maya, GrabPay, ShopeePay or card, pay a down payment, or choose cash on pick-up.',
    category: 'payment'
  },
  {
    id: 'preorder',
    question: 'How do I pre-order a whole lechon?',
    answer:
      'Pre-orders (Cochinillo, Lechon de Leche, Lechon Belly and Traditional Lechon) are for signed-in customers. Log in, open the Pre-order section and pick an available date and batch while slots last.',
    category: 'pre_order'
  },
  {
    id: 'delivery',
    question: 'Do you deliver?',
    answer:
      'Yes. Pick "Delivery" at checkout and set your location on the map. Guests book their own courier (Lalamove, Grab Express, Move It); customers inside our free-delivery area may get free delivery on qualifying orders.',
    category: 'order'
  },
  {
    id: 'cancel',
    question: 'Can I cancel my order?',
    answer:
      'You can cancel from your order tracking page while the order is still pending. Once it is confirmed and being prepared, please message us with the "Urgent" type so we see it right away.',
    category: 'urgent'
  },
  {
    id: 'rewards',
    question: 'How do reward points work?',
    answer:
      'Signed-in customers earn points on completed orders and can redeem them for rewards in the Rewards tab of their dashboard. Guest orders do not earn points.',
    category: 'general'
  }
];
