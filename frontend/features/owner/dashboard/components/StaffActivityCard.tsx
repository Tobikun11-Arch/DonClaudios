'use client';

import {useQuery} from '@tanstack/react-query';
import {Users} from 'lucide-react';
import {httpClient} from '@/lib/api/httpClient';

export type StaffActivityEvent = {
  _id: string;
  actorId: string;
  actorType: 'cashier' | 'admin';
  actorName?: string | null;
  action: 'login' | 'logout' | 'order_status' | 'courier_ack';
  orderId?: string | null;
  meta?: {status?: string; reason?: string} | null;
  client: 'web' | 'mobile';
  at: string;
};

export type StaffActivityOverview = {
  onShift: Array<{actorId: string; name?: string | null; since: string}>;
  handled: Array<{actorId: string; name?: string | null; actorType: string; ordersHandled: number; cancelled: number}>;
  recent: StaffActivityEvent[];
};

const STATUS_WORDS: Record<string, string> = {
  confirmed: 'confirmed',
  preparing: 'started preparing',
  ready: 'marked ready',
  on_the_way: 'sent out',
  completed: 'completed',
  cancelled: 'cancelled'
};

export function describeStaffEvent(e: StaffActivityEvent) {
  const who = e.actorName ?? (e.actorType === 'admin' ? 'Owner' : 'Cashier');
  const order = e.orderId ? `#${String(e.orderId).slice(-6).toUpperCase()}` : '';
  switch (e.action) {
    case 'login':
      return `${who} signed in${e.client === 'mobile' ? ' (mobile app)' : ''}`;
    case 'logout':
      return `${who} signed out${e.client === 'mobile' ? ' (mobile app)' : ''}`;
    case 'courier_ack':
      return `${who} replied to the courier booking on ${order}`;
    default:
      return `${who} ${STATUS_WORDS[e.meta?.status ?? ''] ?? 'updated'} ${order}`.trim();
  }
}

function clock(value: string) {
  return new Date(value).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
}

/** Owner home: who is on shift now, orders handled today, latest staff events. */
export function StaffActivityCard() {
  const query = useQuery({
    queryKey: ['dashboard', 'staff-activity'],
    queryFn: async () => (await httpClient.get<StaffActivityOverview>('/dashboard/staff-activity')).data,
    refetchInterval: 60_000,
    staleTime: 30_000
  });
  const data = query.data;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h3 className="text-[1rem] font-semibold text-[#1A1A1A] dark:text-gray-100">Staff activity</h3>
          <p className="text-[0.8rem] text-[#6B7280] dark:text-gray-400">Today · who is working and what they handled</p>
        </div>
        <Users className="h-4 w-4 text-[#6B7280] dark:text-gray-400" />
      </div>

      {query.isLoading ? (
        <div className="px-5 pb-5 text-sm text-[#6B7280] dark:text-gray-400">Loading staff activity…</div>
      ) : query.isError || !data ? (
        <div className="px-5 pb-5 text-sm text-red-600 dark:text-red-400">Failed to load staff activity.</div>
      ) : (
        <div className="grid gap-5 px-5 pb-5 md:grid-cols-3">
          <div>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400">
              On shift now
            </p>
            {data.onShift.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-gray-400">No cashier signed in.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.onShift.map(s => (
                  <li key={s.actorId} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                    <span className="font-semibold text-[#1A1A1A] dark:text-gray-100">{s.name ?? 'Cashier'}</span>
                    <span className="text-[#6B7280] dark:text-gray-400">since {clock(s.since)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400">
              Orders handled today
            </p>
            {data.handled.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-gray-400">No orders handled yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {data.handled.map(h => (
                    <tr key={h.actorId}>
                      <td className="py-0.5 text-[#1A1A1A] dark:text-gray-100">
                        {h.name ?? 'Staff'}
                        {h.actorType === 'admin' ? <span className="text-[#6B7280]"> (owner)</span> : null}
                      </td>
                      <td className="py-0.5 text-right font-semibold tabular-nums text-[#1A1A1A] dark:text-gray-100">
                        {h.ordersHandled}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400">
              Recent
            </p>
            {data.recent.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-gray-400">Nothing yet.</p>
            ) : (
              <ul className="space-y-1">
                {data.recent.slice(0, 6).map(e => (
                  <li key={e._id} className="text-[0.82rem] text-[#374151] dark:text-gray-300">
                    <span className="tabular-nums text-[#6B7280] dark:text-gray-400">{clock(e.at)}</span>{' '}
                    {describeStaffEvent(e)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
