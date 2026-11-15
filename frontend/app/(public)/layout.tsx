import React from 'react';
import Header from '@/shared/components/layout/Header';
import ConnectedFooter from '@/shared/components/layout/ConnectedFooter';
import CartDrawer from '@/shared/components/cart/CartDrawer';
import GuestCartExpiry from '@/shared/components/cart/GuestCartExpiry';
import SupportChatBubble from '@/features/support/components/SupportChatBubble';
import {Toaster} from '@/components/ui/sonner';

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main className="pt-12">{children}</main>
      <CartDrawer />
      <GuestCartExpiry />
      <ConnectedFooter />
      <SupportChatBubble />
      <Toaster />
    </>
  );
}
