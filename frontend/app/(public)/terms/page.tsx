import { LegalLayout, terms } from "@/features/legal";

export const metadata = { title: "Terms & Conditions | DonClaudio's Lechon House" };

export default function TermsPage() {
  return <LegalLayout {...terms} />;
}
