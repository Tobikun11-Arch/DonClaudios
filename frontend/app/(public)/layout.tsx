import React from 'react';
import Header from '@/shared/components/layout/Header';
import Footer from '@/shared/components/layout/Footer';
import CartDrawer from '@/shared/components/cart/CartDrawer';

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main className="pt-12">{children}</main>
      <CartDrawer />
      <Footer />
    </>
  );
}
