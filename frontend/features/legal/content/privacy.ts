import type { LegalPageProps } from "../components/LegalLayout";

export const privacy: LegalPageProps = {
  slug: "privacy",
  title: "Privacy Policy",
  lastUpdated: "November 7, 2026",
  intro:
    "DonClaudio's Lechon House respects your privacy. This policy explains what personal data we collect, why we collect it, and your rights under the Data Privacy Act of 2012 (RA 10173).",
  sections: [
    {
      heading: "Information We Collect",
      summary: "Account, order, and basic technical information.",
      body: ["We collect only the information we need to run your account and orders."],
      table: {
        columns: ["Type of data", "Examples"],
        rows: [
          ["Account information", "Name, email address, and password (stored in encrypted form)"],
          ["Order information", "Items ordered, order history, delivery address, and contact number"],
          ["Payment information", "Payment status and channel used. Card and e-wallet details are entered on Xendit's page and are not stored by us"],
          ["Technical information", "Browser type and cookies needed for the site to work. We use Google Analytics for site performance monitoring"],
        ],
      },
    },
    {
      heading: "Why We Collect It",
      summary: "To run your account and orders, prevent fraud, and improve our service.",
      body: ["To create and verify your account, process and deliver your orders, send order updates, handle refund claims, prevent fraud, and improve our service."],
    },
    {
      heading: "Sharing of Information",
      summary: "Only with service providers needed to run the business. We never sell your data.",
      body: [
        "We do not sell your personal data. We only share it with service providers needed to run the business.",
        "We may disclose information if required by law.",
      ],
      table: {
        columns: ["Service provider", "Purpose"],
        rows: [
          ["Vercel", "Website hosting"],
          ["MongoDB", "Database"],
          ["Gmail (SMTP)", "Email notifications"],
          ["Xendit", "Online payment processing and refunds"],
        ],
      },
    },
    {
      heading: "Storage & Security",
      summary: "The measures we use to protect your data.",
      body: ["We use reasonable organizational and technical measures to protect your data. No system is completely secure, but we work to prevent unauthorized access, loss, or misuse."],
    },
    {
      heading: "Retention",
      summary: "How long we keep your data. Order records are kept for 3 years.",
      body: ["We keep your data only as long as needed for the purposes above or as required by law. Order records are retained for 3 years."],
    },
    {
      heading: "Your Rights",
      summary: "Your rights under the Data Privacy Act.",
      body: ["Under the Data Privacy Act, you have the right to be informed, to access your data, to correct it, to object to its processing, to request its deletion or blocking, to data portability, and to claim damages for violations."],
    },
    {
      heading: "Complaints",
      summary: "How to raise a concern, including with the National Privacy Commission.",
      body: ["If you believe your data was mishandled, contact us first. You may also file a complaint with the National Privacy Commission (privacy.gov.ph)."],
    },
    {
      heading: "Cookies",
      summary: "Cookies that keep you signed in and remember your cart.",
      body: ["We use cookies to keep you signed in and remember your cart. You may disable cookies in your browser, but some features may not work."],
    },
    {
      heading: "Children",
      summary: "Data from children is only collected with parental consent.",
      body: ["Our service is intended for users of all ages. We do not knowingly collect data from children without parental consent."],
    },
    {
      heading: "Changes to This Policy",
      summary: "The latest version is always on this page.",
      body: ["We may update this policy. The latest version will always be on this page with its updated date."],
    },
    {
      heading: "Contact Us",
      summary: "How to reach us and our Data Protection Officer.",
      body: [
        "For privacy questions or requests: donclaudioslechonhouse@gmail.com / 09155321169 / 09392587229.",
        "Data Protection Officer: Sheena Lee Pineda",
        "Address: Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108.",
      ],
    },
  ],
};
