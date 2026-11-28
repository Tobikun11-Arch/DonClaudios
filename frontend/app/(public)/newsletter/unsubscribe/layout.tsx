import type {Metadata} from 'next';

// page.tsx is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Unsubscribe | DonClaudio's Lechon House",
  robots: {index: false, follow: false}
};

export default function UnsubscribeLayout({children}: {children: React.ReactNode}) {
  return children;
}
