'use client';

import {useMemo, useState} from 'react';
import {Star} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useAdminReviewsQuery,
  useReplyReviewMutation,
  useUpdateReviewStatusMutation
} from '@/lib/hooks/reviews/useReviews';
import type {Review, ReviewStatus} from '@/lib/types/review';
import type {NormalizedApiError} from '@/lib/api/types';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';

type Filter = 'all' | ReviewStatus;

function Stars({rating}: {rating: number}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({length: 5}).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function statusBadge(status: ReviewStatus) {
  const map: Record<ReviewStatus, {label: string; className: string}> = {
    pending: {label: 'Pending', className: 'bg-amber-100 text-amber-700'},
    approved: {label: 'Approved', className: 'bg-green-100 text-green-700'},
    rejected: {label: 'Rejected', className: 'bg-red-100 text-red-600'}
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export default function OwnerReviews() {
  const {data, isLoading, isError} = useAdminReviewsQuery();
  const updateStatus = useUpdateReviewStatusMutation();
  const replyMutation = useReplyReviewMutation();

  const [filter, setFilter] = useState<Filter>('all');
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  const reviews = useMemo(
    () =>
      (data?.reviews ?? []).filter(
        review => filter === 'all' || review.status === filter
      ),
    [data, filter]
  );

  const counts = useMemo(() => {
    const all = data?.reviews ?? [];
    return {
      all: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      approved: all.filter(r => r.status === 'approved').length,
      rejected: all.filter(r => r.status === 'rejected').length
    };
  }, [data]);

  const handleStatus = async (review: Review, status: ReviewStatus) => {
    try {
      await updateStatus.mutateAsync({id: review._id, body: {status}});
      toast.success(
        status === 'approved' ? 'Review approved.' : 'Review rejected.'
      );
    } catch (error) {
      toast.error((error as NormalizedApiError)?.message ?? 'Failed to update review.');
    }
  };

  const openReply = (review: Review) => {
    setReplyingTo(review);
    setReplyText(review.reply ?? '');
  };

  const submitReply = async () => {
    if (!replyingTo) return;
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty.');
      return;
    }
    try {
      await replyMutation.mutateAsync({
        id: replyingTo._id,
        body: {reply: replyText.trim()}
      });
      toast.success('Reply sent. Customer notified via email.');
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      toast.error((error as NormalizedApiError)?.message ?? 'Failed to send reply.');
    }
  };

  const tabs: {key: Filter; label: string; count: number}[] = [
    {key: 'all', label: 'All', count: counts.all},
    {key: 'pending', label: 'Pending', count: counts.pending},
    {key: 'approved', label: 'Approved', count: counts.approved},
    {key: 'rejected', label: 'Rejected', count: counts.rejected}
  ];

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-500 mt-1">
            Approve, reject, and reply to customer reviews. Approved reviews
            appear on the homepage.
          </p>
        </div>
        <OwnerNotificationBell />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              filter === tab.key
                ? 'bg-[#2d4a35] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading reviews...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load reviews.
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          No reviews in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review._id} className="rounded-2xl bg-white shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Stars rating={review.rating} />
                    {statusBadge(review.status)}
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-3">
                    {review.customerName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {review.createdAt
                      ? new Date(review.createdAt).toLocaleString()
                      : ''}
                  </p>
                  <p className="text-sm text-gray-700 mt-3">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                </div>

                <div className="flex md:flex-col gap-2 shrink-0">
                  {review.status !== 'approved' && (
                    <Button
                      onClick={() => handleStatus(review, 'approved')}
                      disabled={updateStatus.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      Approve
                    </Button>
                  )}
                  {review.status !== 'rejected' && (
                    <Button
                      onClick={() => handleStatus(review, 'rejected')}
                      disabled={updateStatus.isPending}
                      variant="destructive"
                      size="sm"
                    >
                      Reject
                    </Button>
                  )}
                  <Button onClick={() => openReply(review)} variant="outline" size="sm">
                    {review.reply ? 'Edit Reply' : 'Reply'}
                  </Button>
                </div>
              </div>

              {review.reply && (
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    Your Reply ({review.replyDate ? new Date(review.replyDate).toLocaleDateString() : ''})
                  </p>
                  <p className="text-sm text-gray-700">&ldquo;{review.reply}&rdquo;</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reply to Review</h3>
            <p className="text-sm text-gray-500 mb-4">
              Replying to {replyingTo.customerName}. They will be notified by email.
            </p>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Write your reply..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
              <Button
                onClick={submitReply}
                disabled={replyMutation.isPending}
                className="bg-[#2d4a35] hover:bg-[#3a5c44] text-white"
              >
                {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
