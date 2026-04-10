import React from 'react';
import Header from '@/shared/components/layout/Header';
import Footer from '@/shared/components/layout/Footer';

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer/>
    </>
  );
}