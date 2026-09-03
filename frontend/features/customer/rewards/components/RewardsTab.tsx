'use client';

import {useMemo, useRef, useState} from 'react';
import Image from 'next/image';
import {Coins, Gift, History, Loader2, Sparkles, X, CheckCircle2, Store, QrCode} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useRewardsQuery,
  useRedeemRewardMutation
} from '@/lib/hooks/rewards/useRewards';
import type {RewardProduct, RewardRedemption} from '@/lib/api/rewardsApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled'
};

export default function RewardsTab() {
  const rewardsQuery = useRewardsQuery();
  const redeemMutation = useRedeemRewardMutation();
  const [selected, setSelected] = useState<RewardProduct | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [redeemedReward, setRedeemedReward] = useState<RewardRedemption | null>(null);
  const [qrView, setQrView] = useState<RewardRedemption | null>(null);
  const redeemedQrRef = useRef<HTMLDivElement>(null);
  const historyQrRef = useRef<HTMLDivElement>(null);

  const downloadQR = (ref: React.RefObject<HTMLDivElement | null>, code: string) => {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reward-qr-${code}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const points = rewardsQuery.data?.points ?? 0;
  const redemptions = rewardsQuery.data?.redemptions ?? [];

  const data = rewardsQuery.data;

  const categories = useMemo(() => {
    const list = data?.products ?? [];
    return ['All', ...Array.from(new Set(list.map(p => p.category)))];
  }, [data]);

  const filteredProducts = useMemo(() => {
    const list = data?.products ?? [];
    return category === 'All'
      ? list
      : list.filter(p => p.category === category);
  }, [data, category]);

  const handleOpenConfirm = (product: RewardProduct) => {
    setSelected(product);
    setConfirmOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selected) return;
    try {
      const result = await redeemMutation.mutateAsync({
        productId: selected._id
      });
      setConfirmOpen(false);
      setSelected(null);
      if (result.redemption.redeemCode) {
        setRedeemedReward(result.redemption);
      }
      toast.success(
        `Reward redeemed! You have ${result.remainingPoints} points left.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to redeem reward'
      );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Points balance hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d4a35] via-[#3a5c44] to-[#2d4a35] p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#7ed4a0]/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-[#f0c060]/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[#b8d4c0]">
              <Sparkles className="h-4 w-4" />
              Your Rewards Balance
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight">
                {points.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-lg font-semibold text-[#7ed4a0]">
                <Coins className="h-5 w-5" />
                points
              </span>
            </p>
            <p className="mt-2 text-sm text-[#b8d4c0]">
              Earn 1 point for every ₱10 you spend. Redeem them for your
              favorite dishes!
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button
              type="button"
              variant="secondary"
              className="rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="h-4 w-4" />
              Redemption History
            </Button>
          </div>
        </div>
      </div>

      {/* Rewards catalog */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-[#2d4a35]" />
          <h2 className="text-xl font-bold text-gray-900">
            Redeem with your points
          </h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Pick a product below and spend your points to get it.
        </p>

        {categories.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  category === cat
                    ? 'bg-[#2d4a35] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {rewardsQuery.isLoading ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-3xl bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#2d4a35]" />
            <p className="mt-3 text-sm text-gray-500">Loading rewards...</p>
          </div>
        ) : rewardsQuery.isError ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-500">
              Failed to load rewards. Please try again.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            <Gift className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No rewards available.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map(product => {
              const canRedeem = points >= product.pointsRequired;
              const soldOut = product.stock <= 0;
              return (
                <div
                  key={product._id}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
                >
                  <div className="relative h-40 w-full bg-gray-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        priority
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Gift className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                    {soldOut && (
                      <span className="absolute left-2 top-2 rounded-full bg-gray-900/80 px-2 py-0.5 text-xs font-bold text-white">
                        Sold Out
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {product.category}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-[#c9a227]" />
                      <span className="font-extrabold text-[#c9a227]">
                        {product.pointsRequired.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">points</span>
                    </div>
                    <Button
                      type="button"
                      className="mt-4 rounded-full w-full"
                      variant={soldOut ? 'outline' : 'default'}
                      disabled={soldOut || !canRedeem}
                      onClick={() => handleOpenConfirm(product)}
                    >
                      {soldOut
                        ? 'Sold Out'
                        : canRedeem
                          ? 'Redeem'
                          : `Need ${(product.pointsRequired - points).toLocaleString()} more`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm redeem modal */}
      {confirmOpen && selected && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Redeem reward?</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Spend{' '}
                  <span className="font-bold text-[#c9a227]">
                    {selected.pointsRequired.toLocaleString()} points
                  </span>{' '}
                  to get{' '}
                  <span className="font-semibold text-gray-900">
                    {selected.name}
                  </span>
                  ?
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => setConfirmOpen(false)}
                disabled={redeemMutation.isPending}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={redeemMutation.isPending}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleConfirmRedeem}
                disabled={redeemMutation.isPending}
                className="rounded-full bg-[#2d4a35] hover:bg-[#3a5c44]"
              >
                {redeemMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  Redemption History
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Products you redeemed with your points.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              {redemptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <History className="h-10 w-10 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">
                    No redemptions yet.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {redemptions.map(redemption => (
                    <li key={redemption._id} className="flex items-center gap-3 py-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {redemption.productImage ? (
                          <Image
                            src={redemption.productImage}
                            alt={redemption.productName}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Gift className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">
                          {redemption.productName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(redemption.createdAt).toLocaleDateString()} ·{' '}
                          {redemption.quantity} pc(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#c9a227]">
                          -{redemption.pointsSpent.toLocaleString()} pts
                        </p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              redemption.status === 'fulfilled'
                                ? 'bg-emerald-100 text-emerald-700'
                                : redemption.status === 'cancelled'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {redemption.status === 'fulfilled' && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {STATUS_LABELS[redemption.status] ??
                              redemption.status}
                          </span>
                          {redemption.status === 'pending' &&
                            redemption.redeemCode && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 rounded-full p-0 text-[#2d4a35] hover:bg-[#2d4a35] hover:text-white"
                                onClick={() => setQrView(redemption)}
                                aria-label="Show QR code"
                              >
                                <QrCode className="h-3 w-3" />
                              </Button>
                            )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
      </div>
    )}

    {/* QR Code modal — shown after successful redeem */}
    {redeemedReward && (
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        onClick={() => setRedeemedReward(null)}
      >
        <div
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#2d4a35]" />
              <p className="text-lg font-bold text-gray-900">
                Your Redemption QR
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => setRedeemedReward(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 flex justify-center" ref={redeemedQrRef}>
            <QRCodeSVG
              value={redeemedReward.redeemCode ?? ''}
              size={200}
              level="M"
              includeMargin
            />
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadQR(redeemedQrRef, redeemedReward.redeemCode ?? '')}
              className="rounded-full"
            >
              Download QR Code
            </Button>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800">
              <Store className="h-4 w-4" />
              In-Store Only
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Rewards can only be redeemed at our physical store. Show this QR
              code at the counter to claim your reward.
            </p>
          </div>

          <p className="mt-3 truncate text-center text-xs text-gray-400">
            Code: {redeemedReward.redeemCode}
          </p>
        </div>
      </div>
    )}

    {/* QR Code view modal — shown from history */}
    {qrView && (
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        onClick={() => setQrView(null)}
      >
        <div
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#2d4a35]" />
              <p className="text-lg font-bold text-gray-900">
                Redemption QR
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => setQrView(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 flex justify-center" ref={historyQrRef}>
            <QRCodeSVG
              value={qrView.redeemCode ?? ''}
              size={200}
              level="M"
              includeMargin
            />
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadQR(historyQrRef, qrView.redeemCode ?? '')}
              className="rounded-full"
            >
              Download QR Code
            </Button>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800">
              <Store className="h-4 w-4" />
              In-Store Only
            </p>
            <p className="mt-1 text-xs text-amber-700">
              This reward can only be claimed in-store. Present this QR code at
              the counter to redeem.
            </p>
          </div>

          <p className="mt-3 truncate text-center text-xs text-gray-400">
            Code: {qrView.redeemCode}
          </p>
        </div>
      </div>
    )}
  </div>
);
}
