'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useStoreStatusQuery} from '@/lib/hooks/useStoreStatus';
import {
  useToggleManualCloseMutation,
  useUpdateStoreSettingsMutation
} from '@/lib/hooks/useStoreStatusMutations';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Clock, AlertTriangle, CheckCircle2, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {StoreStatus} from '@/lib/api/storeStatusApi';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function formatEffectiveClose(
  closingTime: string,
  advanceMinutes: number
): string {
  const total = (((timeToMinutes(closingTime) - advanceMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function StoreStatusCard() {
  const {data, isLoading} = useStoreStatusQuery();

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 animate-pulse rounded-lg w-64" />
        <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
        <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Unable to load store status.
      </div>
    );
  }

  return <StoreStatusForm key={data.status.closingTime} initial={data.status} />;
}

function StoreStatusForm({initial}: {initial: StoreStatus}) {
  const [closingTime, setClosingTime] = useState(initial.closingTime || '22:00');
  const [advanceMinutes, setAdvanceMinutes] = useState(
    initial.advanceCloseMinutes || 30
  );
  const [isManuallyClosed, setIsManuallyClosed] = useState(
    initial.isManuallyClosed || false
  );
  const [manualReason, setManualReason] = useState(
    initial.manualCloseReason || ''
  );

  const updateMutation = useUpdateStoreSettingsMutation();
  const toggleMutation = useToggleManualCloseMutation();

  const isOpen = initial.isOpen;
  const isSubmitting = updateMutation.isPending || toggleMutation.isPending;

  const saveSchedule = () => {
    updateMutation.mutate(
      {closingTime, advanceCloseMinutes: advanceMinutes},
      {
        onError: err =>
          toast.error(getFriendlyErrorMessage(err, 'Failed to save store hours')),
        onSuccess: () => toast.success('Store hours saved.')
      }
    );
  };

  const toggleManual = () => {
    const next = !isManuallyClosed;
    toggleMutation.mutate(
      {isManuallyClosed: next, reason: manualReason},
      {
        onError: err =>
          toast.error(
            getFriendlyErrorMessage(err, 'Failed to update store status')
          ),
        onSuccess: () => {
          setIsManuallyClosed(next);
          toast.success(
            next ? 'Store marked as closed.' : 'Store is now open.'
          );
        }
      }
    );
  };

  const effectiveCloseTime = formatEffectiveClose(closingTime, advanceMinutes);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[#2d4a35]">Store Status</h2>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
            isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}
        >
          {isOpen ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        {isOpen
          ? `Ordering is available to customers until ${effectiveCloseTime}. The store closes at ${initial.closesAt}.`
          : isManuallyClosed
            ? `Manually closed. Customers will see a "we're closed" notice with${manualReason ? ` reason: "${manualReason}"` : 'out a custom reason'}.`
            : `Ordering closed at ${effectiveCloseTime}. Customers currently see a "we're closed" notice.`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="closing-time">Closing time</Label>
          <Input
            id="closing-time"
            type="time"
            value={closingTime}
            onChange={e => setClosingTime(e.target.value || '22:00')}
            className="min-h-[44px]"
            aria-label="Closing time"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="advance-close">Advance close (minutes)</Label>
          <Input
            id="advance-close"
            type="number"
            min={5}
            max={60}
            step={5}
            value={advanceMinutes}
            onChange={e =>
              setAdvanceMinutes(
                Math.min(60, Math.max(5, Number(e.target.value) || 30))
              )
            }
            className="min-h-[44px]"
            aria-label="Advance close minutes"
          />
          <p className="text-xs text-gray-400">
            Ordering stops {advanceMinutes} minutes before closing time.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={saveSchedule}
          disabled={isSubmitting}
          className="bg-[#2d4a35] hover:bg-[#3c5e45]"
        >
          {updateMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Save Hours
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-4 w-4" />
          Customers stop ordering at {effectiveCloseTime}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {isManuallyClosed
                ? 'Store is closed'
                : 'Manual close (emergency)'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isManuallyClosed
                ? 'Customers currently see a closed notice.'
                : 'Instantly stop ordering regardless of schedule.'}
            </p>
          </div>
          <Button
            type="button"
            onClick={toggleManual}
            disabled={isSubmitting}
            variant={isManuallyClosed ? 'outline' : 'destructive'}
            className={cn(
              'shrink-0',
              isManuallyClosed &&
                'border-green-500 text-green-600 hover:bg-green-50'
            )}
          >
            {toggleMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isManuallyClosed ? 'Reopen Store' : 'Close Store Now'}
          </Button>
        </div>

        {isManuallyClosed && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="manual-reason">
              Reason shown to customers (optional)
            </Label>
            <Input
              id="manual-reason"
              value={manualReason}
              onChange={e => setManualReason(e.target.value)}
              placeholder="e.g. Power outage, event, restocking..."
              className="min-h-[44px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                toggleMutation.mutate(
                  {isManuallyClosed: true, reason: manualReason},
                  {
                    onError: err =>
                      toast.error(
                        getFriendlyErrorMessage(err, 'Failed to save reason')
                      ),
                    onSuccess: () => toast.success('Reason saved.')
                  }
                );
              }}
              disabled={isSubmitting}
            >
              Save reason
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}