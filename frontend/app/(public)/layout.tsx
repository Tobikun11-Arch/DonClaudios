import React from 'react';
import Header from '@/shared/components/layout/Header';
import ConnectedFooter from '@/shared/components/layout/ConnectedFooter';
import CartDrawer from '@/shared/components/cart/CartDrawer';
import SupportChatBubble from '@/features/support/components/SupportChatBubble';

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main className="pt-12">{children}</main>
      <CartDrawer />
      <ConnectedFooter />
      <SupportChatBubble />
    </>
  );
}
