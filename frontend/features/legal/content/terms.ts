import type { LegalPageProps } from "../components/LegalLayout";

export const terms: LegalPageProps = {
  title: "Terms & Conditions",
  lastUpdated: "October 24, 2026",
  intro:
    "By creating an account or placing an order on this website, you agree to these Terms & Conditions.",
  sections: [
    { heading: "Acceptance of Terms", body: ["By using this site, you confirm that you have read and agree to these Terms, our Return Policy, and our Privacy Policy."] },
    { heading: "Accounts", body: ["You are responsible for keeping your login details secure and for all activity under your account. Please provide accurate information, including a valid email address for verification."] },
    { heading: "Orders & Pricing", body: ["All prices are in Philippine Peso (PHP). We may refuse or cancel an order due to stock unavailability, pricing errors, or suspected fraud.", "Promos and vouchers are subject to their stated conditions and cannot be combined unless stated."] },
    { heading: "Payment", body: ["Payment must be made through the methods offered at checkout: GCash, Maya, BDO, BPI, and PSBank."] },
    { heading: "Delivery & Pickup", body: ["Delivery times are estimates only. We are not liable for delays caused by traffic, weather, or incorrect addresses provided by the customer."] },
    { heading: "Returns & Refunds", body: ["Returns and refunds are governed by our Return & Refund Policy at /return-policy."] },
    { heading: "Food Allergies", body: ["Our kitchen handles multiple ingredients. Please contact us before ordering if you have any food allergies."] },
    { heading: "Privacy", body: ["We handle your personal data according to our Privacy Policy at /privacy and the Data Privacy Act of 2012 (RA 10173)."] },
    { heading: "Prohibited Use", body: ["You may not misuse the site, attempt unauthorized access, or place fraudulent orders."] },
    { heading: "Changes to These Terms", body: ["We may update these Terms from time to time. Continued use of the site means you accept the updated Terms."] },
    { heading: "Governing Law & Contact", body: ["These Terms are governed by the laws of the Republic of the Philippines.", "Contact us: donclaudioslechonhouse@gmail.com / 09155321169 / Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108."] },
  ],
};
