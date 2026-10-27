'use client';

import type {Promo} from '@/lib/types/promo';

export function PromosCard({promos}: {promos: Promo[]}) {
  if (!promos || promos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-foreground">Promos for you</h2>
      <div className="mt-4 space-y-3">
        {promos.map(p => (
          <div
            key={p._id}
            className="rounded-xl border border-border p-4"
          >
            <p className="font-medium text-foreground">{p.title}</p>
            {p.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {p.description}
              </p>
            )}
            <p className="mt-2 text-xs text-accent-warm">
              Until{' '}
              {new Date(p.endDate).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
