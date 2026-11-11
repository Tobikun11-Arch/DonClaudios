'use client';

import type {Promo} from '@/lib/types/promo';

export function PromosCard({promos}: {promos: Promo[]}) {
  if (!promos || promos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-lg font-bold text-foreground dark:text-gray-100">Promos for you</h2>
      <div className="mt-4 space-y-3">
        {promos.map(p => (
          <div
            key={p._id}
            className="rounded-xl border border-border p-4 dark:border-gray-700"
          >
            <p className="font-medium text-foreground dark:text-gray-100">{p.title}</p>
            {p.description && (
              <p className="mt-1 text-xs text-muted-foreground dark:text-gray-400">
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
