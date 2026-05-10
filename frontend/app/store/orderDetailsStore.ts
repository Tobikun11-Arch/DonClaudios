import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export type OrderType = 'Delivery' | 'Pick-up' | 'Reservation';

function getTodayDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type OrderDetailsStore = {
  orderType: OrderType;
  timing: 'ASAP';
  reservationDate: string;
  reservationTime: string;
  reservationGuests: number;
  setOrderType: (orderType: OrderType) => void;
  setTiming: (timing: 'ASAP') => void;
  setReservationDate: (date: string) => void;
  setReservationTime: (time: string) => void;
  setReservationGuests: (guests: number) => void;
};

export const useOrderDetailsStore = create<OrderDetailsStore>()(
  persist(
    set => ({
      orderType: 'Delivery',
      timing: 'ASAP',
      reservationDate: getTodayDateString(),
      reservationTime: '18:00',
      reservationGuests: 1,
      setOrderType: orderType => set({orderType}),
      setTiming: timing => set({timing}),
      setReservationDate: reservationDate => set({reservationDate}),
      setReservationTime: reservationTime => set({reservationTime}),
      setReservationGuests: reservationGuests =>
        set({reservationGuests: Math.max(1, reservationGuests)})
    }),
    {
      name: 'donclaudios_order_details'
    }
  )
);
