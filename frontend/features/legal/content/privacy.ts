import type { LegalPageProps } from "../components/LegalLayout";

export const privacy: LegalPageProps = {
  slug: "privacy",
  title: "Privacy Policy",
  lastUpdated: "November 23, 2026",
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
          ["Google account information (only if you choose \"Continue with Google\")", "Your Google account ID, name, email address, and profile picture"],
          ["Order information", "Items ordered, order history, delivery address, and contact number"],
          ["Payment information", "Payment status and channel used. Card and e-wallet details are entered on Xendit's page and are not stored by us"],
          ["Technical information", "Browser type and cookies needed for the site to work. We use Google Analytics for site performance monitoring"],
        ],
      },
    },
    {
      heading: "Google User Data",
      summary: "What Google user data we access, how we use, share, store, protect, retain, and delete it.",
      body: [
        "This section explains how DonClaudio's Lechon House (https://www.donclaudios.com) accesses, uses, stores, shares, protects, retains, and deletes Google user data when you choose \"Continue with Google\" to sign up or sign in. Signing in with Google is optional; you can also create an account with an email address and password.",
        "DonClaudio's Lechon House's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.",
      ],
      table: {
        columns: ["Topic", "How we handle Google user data"],
        rows: [
          [
            "Data accessed",
            "We request only the basic sign-in scopes (openid, email, profile). From your Google Account we receive: your Google account ID, your name, your email address, whether that email is verified, and your profile picture. We do not access your Gmail, Contacts, Drive, Calendar, or any other Google service, and we never see your Google password.",
          ],
          [
            "Data usage",
            "We use Google user data only to provide our ordering service to you: to create your DonClaudio's Lechon House customer account or sign you in to it, to link it to an existing account with the same email, to show your name and profile picture in your account, and to send you order confirmations and order updates by email. We do not use Google user data for advertising, we do not sell it, and we do not use it to develop, improve, or train artificial intelligence or machine learning models.",
          ],
          [
            "Data sharing",
            "We do not sell, rent, or share Google user data with third parties for their own purposes. It is processed only by the service providers that run our website and database (Vercel for hosting, MongoDB for the database, and Gmail SMTP to send your order emails), only to provide our service to you. We may disclose it only if required by law.",
          ],
          [
            "Data storage and protection",
            "Google user data is stored in our MongoDB database together with your customer account. All connections between your browser, our website, and our servers use HTTPS (TLS encryption). The database requires authentication, access is limited to authorized staff who need it to handle your orders, and Google sign-in tokens are verified on our server and are not stored.",
          ],
          [
            "Data retention",
            "We keep Google user data only while your account is active. Order records linked to your account are kept for 3 years as described in the Retention section.",
          ],
          [
            "Data deletion",
            "You can unlink Google at any time in your account settings, which deletes your stored Google account ID and Google email from our database. You can also remove our access at https://myaccount.google.com/permissions. To delete your account and all of its Google user data, email donclaudioslechonhouse@gmail.com; we will delete it within 30 days, except order records we must keep by law.",
          ],
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
          ["Google", "Optional sign-in with Google (we receive your basic profile from Google) and website traffic statistics (Google Analytics)"],
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
      body: [
        "We use reasonable organizational and technical measures to protect your data, including the information we receive from Google Sign-In.",
        "Your data, including your Google account ID, name, email address, and profile picture, is stored in our MongoDB database. All traffic between your browser, our website, and our servers is encrypted with HTTPS (TLS), and passwords are stored only as one-way hashes. Access to customer data is limited to our authorized staff and only as needed to handle your orders.",
        "No system is completely secure, but we work to prevent unauthorized access, loss, or misuse.",
      ],
    },
    {
      heading: "Retention",
      summary: "How long we keep your data. Order records are kept for 3 years.",
      body: [
        "We keep your data only as long as needed for the purposes above or as required by law. Order records are retained for 3 years.",
        "Information we received from Google Sign-In is kept only while your account is active. If you unlink Google from your account, we delete your stored Google account ID and Google email. If you ask us to delete your account, we delete your Google information along with your account within 30 days, except order records we must keep by law.",
      ],
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
      body: [
        "We may update this policy. The latest version will always be on this page with its updated date.",
        "If we change how we access, use, share, or store Google user data, we will update this policy and notify you by email or on the website before the change takes effect.",
      ],
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
