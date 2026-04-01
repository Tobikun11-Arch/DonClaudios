import React from 'react';
import Header from '@/shared/components/layout/Header';

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}