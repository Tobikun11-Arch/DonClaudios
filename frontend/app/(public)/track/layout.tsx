import type {Metadata} from 'next';

// page.tsx is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Track Your Order | DonClaudio's Lechon House",
  description:
    "Check the status of your DonClaudio's Lechon House order – from preparation to pick-up or delivery."
};

export default function TrackLayout({children}: {children: React.ReactNode}) {
  return children;
}
