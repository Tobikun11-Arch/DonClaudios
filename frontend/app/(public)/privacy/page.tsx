import { LegalLayout, privacy } from "@/features/legal";

export const metadata = { title: "Privacy Policy | DonClaudio's Lechon House" };

export default function PrivacyPage() {
  return <LegalLayout {...privacy} />;
}
