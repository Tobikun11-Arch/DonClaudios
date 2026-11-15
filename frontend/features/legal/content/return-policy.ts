import type { LegalPageProps } from "../components/LegalLayout";

export const returnPolicy: LegalPageProps = {
  slug: "return-policy",
  title: "Return & Refund Policy",
  lastUpdated: "November 15, 2026",
  intro:
    "Our food is prepared fresh for every order. Because our products are perishable, the following policy applies.",
  sections: [
    {
      heading: "Perishable Goods",
      summary: "Food items cannot be returned once delivered or picked up.",
      body: ["For food safety reasons, we do not accept returns of food items once they have been delivered or picked up."],
    },
    {
      heading: "Eligible for Refund or Replacement",
      summary: "Wrong, incomplete, spoiled, or damaged orders.",
      body: ["You may request a refund or replacement in the cases below. Anything not listed as eligible is not covered."],
      table: {
        columns: ["Eligible", "Not eligible"],
        rows: [
          ["You received the wrong item", "Change of mind"],
          ["Your order is incomplete", "Wrong address provided by the customer"],
          ["The item arrived spoiled or damaged", "Failure to receive the order"],
          ["The item does not match what you ordered", "Issues reported after the claim period"],
        ],
      },
    },
    {
      heading: "How to File a Claim",
      summary: "Contact us within 2 hours with your order number and a photo.",
      body: [
        "Contact us within 2 hours of receiving your order at donclaudioslechonhouse@gmail.com or 09155321169 / 09392587229. Include your order number and a clear photo of the issue.",
        "You may also reach us through our Google Business Profile or Facebook page at https://facebook.com/DONCLAUDIOSLECHONHOUSE/.",
      ],
    },
    {
      heading: "Cancellations",
      summary: "When an order can be cancelled, including pre-orders.",
      body: [
        "Regular orders may be cancelled while they are still pending (before the store confirms them).",
        "Pre-orders (e.g. whole lechon for a holiday date) follow the refund rules below. The cancellation cut-off is shown on your order (14 days before pickup unless the date says otherwise).",
        "Orders that are not paid within the time shown after confirmation (online payment link, or the in-store payment deadline) are cancelled automatically.",
      ],
      table: {
        columns: ["When", "What you get back"],
        rows: [
          ["You cancel on or before the cut-off", "100% of the order amount you paid. Online service fees are not refunded."],
          ["You ask to cancel after the cut-off (until pickup)", "The store reviews your request. If approved, the 50% down payment is kept and anything paid above it is refunded. If declined, the order stays as booked."],
          ["The store cancels your order", "Everything you paid, including online service fees."],
        ],
      },
    },
    {
      heading: "Refund Processing",
      summary: "Refunds go back to your original payment method.",
      body: [
        "Refunds for online payments are returned automatically to the original payment method (GCash, Maya, GrabPay, ShopeePay or card). Most refunds arrive within 5-7 business days, depending on your bank or e-wallet.",
        "Online service fees are charged by our payment provider and are only refunded when the store cancels the order.",
        "Cash paid at the store is refunded in cash at the store counter. Bring your order number.",
      ],
    },
  ],
};
