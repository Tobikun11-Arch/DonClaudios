import type { LegalPageProps } from "../components/LegalLayout";

export const returnPolicy: LegalPageProps = {
  title: "Return & Refund Policy",
  lastUpdated: "October 24, 2026",
  intro:
    "Our food is prepared fresh for every order. Because our products are perishable, the following policy applies.",
  sections: [
    { heading: "Perishable Goods", body: ["For food safety reasons, we do not accept returns of food items once they have been delivered or picked up."] },
    { heading: "Eligible for Refund or Replacement", body: ["You may request a refund or replacement if: (a) you received the wrong item, (b) your order is incomplete, (c) the item arrived spoiled or damaged, or (d) the item does not match what you ordered."] },
    { heading: "How to File a Claim", body: ["Contact us within 2 hours of receiving your order at donclaudioslechonhouse@gmail.com or 09155321169 / 09392587229. Include your order number and a clear photo of the issue.", "You may also reach us through our Google Business Profile or Facebook page at https://facebook.com/DONCLAUDIOSLECHONHOUSE/."] },
    { heading: "Not Eligible", body: ["Change of mind, wrong address provided by the customer, failure to receive the order, or issues reported after the claim period."] },
    { heading: "Cancellations", body: ["Orders may be cancelled before preparation begins. Pre-orders (e.g. whole lechon) must be cancelled at least 48 hours before the scheduled date. Late cancellations may not be refunded."] },
    { heading: "Refund Processing", body: ["Approved refunds are returned through the original payment method within 5-7 business days."] },
  ],
};
