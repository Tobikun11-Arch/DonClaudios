import {useCartStore} from '@/app/store/cartStore';
import {addCartItem} from '@/lib/api/cartApi';
import {customerCartQueryKey} from '@/lib/hooks/cart/useCustomerCart';
import type {QueryClient} from '@tanstack/react-query';

export async function transferGuestCartToAccount(
  queryClient?: QueryClient
): Promise<void> {
  const guestItems = useCartStore.getState().items;
  if (guestItems.length === 0) return;

  for (const item of [...guestItems]) {
    try {
      await addCartItem({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.qty,
        imageUrl: item.imageUrl,
        instructions: item.instructions
      });
      useCartStore.setState(state => ({
        items: state.items.filter(i => i.productId !== item.productId)
      }));
    } catch {
      // Leave remaining guest items for a later retry.
      break;
    }
  }

  if (useCartStore.getState().items.length === 0) {
    useCartStore.getState().clear();
  }

  if (queryClient) {
    await queryClient.invalidateQueries({queryKey: customerCartQueryKey});
  }
}
