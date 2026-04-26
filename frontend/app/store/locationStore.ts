import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {LocationState} from '@/features/order/components/LocationPicker';

type LocationStore = {
  location: LocationState | null;
  setLocation: (location: LocationState) => void;
  clearLocation: () => void;
};

export const useLocationStore = create<LocationStore>()(
  persist(
    set => ({
      location: null,
      setLocation: location => set({location}),
      clearLocation: () => set({location: null})
    }),
    {
      name: 'donclaudios_location'
    }
  )
);
