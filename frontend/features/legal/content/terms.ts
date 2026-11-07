import type { LegalPageProps } from "../components/LegalLayout";

export const terms: LegalPageProps = {
  slug: "terms",
  title: "Terms & Conditions",
  lastUpdated: "November 7, 2026",
  intro:
    "By creating an account or placing an order on this website, you agree to these Terms & Conditions.",
  sections: [
    {
      heading: "Acceptance of Terms",
      summary: "Using the site means you agree to these Terms, our Return Policy, and our Privacy Policy.",
      body: ["By using this site, you confirm that you have read and agree to these Terms, our Return Policy, and our Privacy Policy."],
    },
    {
      heading: "Accounts",
      summary: "Keeping your login secure and your details accurate.",
      body: ["You are responsible for keeping your login details secure and for all activity under your account. Please provide accurate information, including a valid email address for verification."],
    },
    {
      heading: "Orders & Pricing",
      summary: "Prices in PHP, order cancellation by the store, and promo conditions.",
      body: [
        "All prices are in Philippine Peso (PHP). We may refuse or cancel an order due to stock unavailability, pricing errors, or suspected fraud.",
        "Promos and vouchers are subject to their stated conditions and cannot be combined unless stated.",
      ],
    },
    {
      heading: "Payment",
      summary: "When payment opens, the payment options, and the transaction fee.",
      body: [
        "Payment opens after our team confirms your order. Online payments are processed securely by our payment provider, Xendit, through GCash, Maya, GrabPay, ShopeePay, or credit/debit card.",
        "Online payments include a transaction fee charged by the payment provider. The exact fee is shown before you pay and depends on the payment channel you choose.",
        "If an online payment is not completed within the time shown, the order is cancelled automatically.",
      ],
      table: {
        columns: ["Payment option", "Available for", "When to pay"],
        rows: [
          ["Pay in full online", "All online orders", "After the store confirms your order"],
          ["50% down payment online", "Orders with pre-order items only", "Down payment after confirmation; balance online or in cash on pickup"],
          ["Cash on pickup", "Pick-up orders only", "When you collect your order at the store"],
        ],
      },
    },
    {
      heading: "Delivery & Pickup",
      summary: "Delivery estimates, free lechon delivery, and Lalamove bookings.",
      body: [
        "Delivery times are estimates only. We are not liable for delays caused by traffic, weather, or incorrect addresses provided by the customer.",
        "Lechon orders and orders of ₱3,000 or more are delivered by DonClaudio's for free. Other delivery orders are booked and paid by the customer through Lalamove.",
      ],
    },
    {
      heading: "Returns & Refunds",
      summary: "Covered by our separate Return & Refund Policy.",
      body: ["Returns and refunds are governed by our Return & Refund Policy at /return-policy."],
    },
    {
      heading: "Food Allergies",
      summary: "Contact us before ordering if you have food allergies.",
      body: ["Our kitchen handles multiple ingredients. Please contact us before ordering if you have any food allergies."],
    },
    {
      heading: "Privacy",
      summary: "How your personal data is handled under RA 10173.",
      body: ["We handle your personal data according to our Privacy Policy at /privacy and the Data Privacy Act of 2012 (RA 10173)."],
    },
    {
      heading: "Prohibited Use",
      summary: "Misuse, unauthorized access, and fraudulent orders are not allowed.",
      body: ["You may not misuse the site, attempt unauthorized access, or place fraudulent orders."],
    },
    {
      heading: "Changes to These Terms",
      summary: "We may update these Terms; continued use means you accept them.",
      body: ["We may update these Terms from time to time. Continued use of the site means you accept the updated Terms."],
    },
    {
      heading: "Governing Law & Contact",
      summary: "Philippine law applies, and how to reach us.",
      body: [
        "These Terms are governed by the laws of the Republic of the Philippines.",
        "Contact us: donclaudioslechonhouse@gmail.com / 09155321169 / Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108.",
      ],
    },
  ],
};
