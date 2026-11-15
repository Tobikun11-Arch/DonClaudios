import PreOrdersPage from '@/features/owner/preorders/components/PreOrdersPage';

/** Cashier view of the pre-order dates: who ordered, and status changes only. */
export default function CashierPreOrdersSlot() {
  return <PreOrdersPage role="cashier" />;
}
