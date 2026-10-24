import type { LegalPageProps } from "../components/LegalLayout";

export const privacy: LegalPageProps = {
  title: "Privacy Policy",
  lastUpdated: "October 24, 2026",
  intro:
    "DonClaudio's Lechon House respects your privacy. This policy explains what personal data we collect, why we collect it, and your rights under the Data Privacy Act of 2012 (RA 10173).",
  sections: [
    { heading: "Information We Collect", body: ["Account information: name, email address, and password (stored in encrypted form).", "Order information: items ordered, order history, delivery address, and contact number.", "Technical information: basic data such as browser type and cookies needed for the site to work. We use Google Analytics for site performance monitoring."] },
    { heading: "Why We Collect It", body: ["To create and verify your account, process and deliver your orders, send order updates, handle refund claims, prevent fraud, and improve our service."] },
    { heading: "Sharing of Information", body: ["We do not sell your personal data. We only share it with service providers needed to run the business, such as Vercel (hosting), MongoDB (database), SMTP from Gmail (email services), and payment processors.", "We may disclose information if required by law."] },
    { heading: "Storage & Security", body: ["We use reasonable organizational and technical measures to protect your data. No system is completely secure, but we work to prevent unauthorized access, loss, or misuse."] },
    { heading: "Retention", body: ["We keep your data only as long as needed for the purposes above or as required by law. Order records are retained for 3 years."] },
    { heading: "Your Rights", body: ["Under the Data Privacy Act, you have the right to be informed, to access your data, to correct it, to object to its processing, to request its deletion or blocking, to data portability, and to claim damages for violations."] },
    { heading: "Complaints", body: ["If you believe your data was mishandled, contact us first. You may also file a complaint with the National Privacy Commission (privacy.gov.ph)."] },
    { heading: "Cookies", body: ["We use cookies to keep you signed in and remember your cart. You may disable cookies in your browser, but some features may not work."] },
    { heading: "Children", body: ["Our service is intended for users of all ages. We do not knowingly collect data from children without parental consent."] },
    { heading: "Changes to This Policy", body: ["We may update this policy. The latest version will always be on this page with its updated date."] },
    { heading: "Contact Us", body: ["For privacy questions or requests: donclaudioslechonhouse@gmail.com / 09155321169 / 09392587229.", "Data Protection Officer: Sheena Lee Pineda", "Address: Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108."] },
  ],
};
