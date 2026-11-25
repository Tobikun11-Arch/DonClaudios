import type {Metadata} from 'next';

// page.tsx is a client component, so its metadata lives here. Without it the
// page inherited the homepage title/description and looked like a duplicate.
export const metadata: Metadata = {
  title: "Order Lechon Online | DonClaudio's Lechon House",
  description:
    "Browse the DonClaudio's Lechon House menu of crispy lechon and traditional Filipino dishes. Order online for pick-up or delivery in Tanza, Cavite."
};

export default function OrderLayout({children}: {children: React.ReactNode}) {
  return children;
}
