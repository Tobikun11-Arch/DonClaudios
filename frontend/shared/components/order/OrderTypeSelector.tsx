'use client';

import {Bike, CalendarClock, Check, ShoppingBag} from 'lucide-react';

export type OrderType = 'Delivery' | 'Pick-up' | 'Reservation';

type OrderTypeSelectorProps = {
  value: OrderType;
  onChange: (type: OrderType) => void;
  deliverySubtitle?: string;
  className?: string;
};

export default function OrderTypeSelector({
  value,
  onChange,
  deliverySubtitle = 'To your door',
  className
}: OrderTypeSelectorProps) {
  const types: OrderType[] = ['Delivery', 'Pick-up', 'Reservation'];

  return (
    <div
      className={className ?? 'flex gap-3'}
      role="radiogroup"
      style={
        {
          ['--brand-green']: '#3d6146',
          ['--brand-green-tint']: '#eef4ef',
          ['--border']: '#e2e2de',
          ['--surface-muted']: '#f1f1ee',
          ['--text']: '#1a1a1a',
          ['--text-muted']: '#5f5f5a'
        } as React.CSSProperties
      }
    >
      {types.map(type => {
        const isSelected = value === type;
        const subtitle =
          type === 'Delivery'
            ? deliverySubtitle
            : type === 'Pick-up'
              ? 'Grab it at the shop'
              : 'Book a table';

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(type)}
            className="relative flex flex-1 flex-col items-center gap-2 rounded-2xl border-[1.5px] bg-white px-2 pb-4 pt-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2"
            style={{
              borderColor: isSelected ? 'var(--brand-green)' : 'var(--border)',
              backgroundColor: isSelected ? 'var(--brand-green-tint)' : 'white',
              boxShadow: isSelected ? '0 0 0 1px var(--brand-green)' : undefined,
              minHeight: '44px'
            }}
          >
            {isSelected ? (
              <div
                className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                style={{backgroundColor: 'var(--brand-green)'}}
              >
                <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
              </div>
            ) : null}
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[14px]"
              style={{
                backgroundColor: isSelected
                  ? 'var(--brand-green)'
                  : 'var(--surface-muted)',
                color: isSelected ? 'white' : 'var(--brand-green)'
              }}
            >
              {type === 'Delivery' ? (
                <Bike className="h-6 w-6" strokeWidth={2} />
              ) : type === 'Pick-up' ? (
                <ShoppingBag className="h-6 w-6" strokeWidth={2} />
              ) : (
                <CalendarClock className="h-6 w-6" strokeWidth={2} />
              )}
            </div>
            <p
              className="text-[15px] font-bold"
              style={{color: 'var(--text)'}}
            >
              {type === 'Pick-up' ? 'Pick-up' : type}
            </p>
            <p
              className="text-[12px] leading-tight"
              style={{color: 'var(--text-muted)'}}
            >
              {subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
}
