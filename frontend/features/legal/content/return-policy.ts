import type { LegalPageProps } from "../components/LegalLayout";

export const returnPolicy: LegalPageProps = {
  slug: "return-policy",
  title: "Return & Refund Policy",
  lastUpdated: "November 7, 2026",
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
        "Orders may be cancelled before preparation begins. Pre-orders (e.g. whole lechon) must be cancelled at least 48 hours before the scheduled date. Late cancellations may not be refunded.",
        "Orders that are not paid online within the time shown after confirmation are cancelled automatically.",
      ],
    },
    {
      heading: "Refund Processing",
      summary: "Refunds go back to your original payment method.",
      body: [
        "Approved refunds for online payments are returned to the original payment method, including the transaction fee. Most refunds arrive within 5-7 business days, depending on your bank or e-wallet.",
        "Refunds for cash payments are settled at the store.",
      ],
    },
  ],
};
