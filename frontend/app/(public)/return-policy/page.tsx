import { LegalLayout, returnPolicy } from "@/features/legal";

export const metadata = { title: "Return Policy | DonClaudio's Lechon House" };

export default function ReturnPolicyPage() {
  return <LegalLayout {...returnPolicy} />;
}
