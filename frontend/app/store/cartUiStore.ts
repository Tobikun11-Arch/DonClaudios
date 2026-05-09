import {create} from 'zustand';

type CartUiStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useCartUiStore = create<CartUiStore>()((set, get) => ({
  isOpen: false,
  open: () => set({isOpen: true}),
  close: () => set({isOpen: false}),
  toggle: () => set({isOpen: !get().isOpen})
}));
