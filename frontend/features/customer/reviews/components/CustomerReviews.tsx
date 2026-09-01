'use client';

import {useState} from 'react';
import {Star} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {useCreateReviewMutation, useMyReviewsQuery} from '@/lib/hooks/reviews/useReviews';
import type {Review} from '@/lib/types/review';
import type {NormalizedApiError} from '@/lib/api/types';

function StarRating({
  value,
  onChange,
  disabled
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="disabled:cursor-not-allowed"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function statusBadge(review: Review) {
  const map: Record<string, {label: string; className: string}> = {
    pending: {
      label: 'Pending Approval',
      className: 'bg-amber-100 text-amber-700'
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-100 text-green-700'
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-600'
    }
  };
  const cfg = map[review.status] ?? map.pending;
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export default function CustomerReviews() {
  const {data, isLoading, isError} = useMyReviewsQuery();
  const createMutation = useCreateReviewMutation();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const reviews = data?.reviews ?? [];

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error('Please select a rating.');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write your review.');
      return;
    }

    try {
      await createMutation.mutateAsync({rating, comment});
      toast.success('Review submitted! It will appear after approval.');
      setRating(0);
      setComment('');
    } catch (error) {
      const err = error as NormalizedApiError;
      const code = err?.code;
      if (code === 'REVIEW_NOT_ELIGIBLE') {
        toast.error('You need at least one completed order to leave a review.');
      } else {
        toast.error(err?.message ?? 'Failed to submit review.');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Reviews</h2>
          <p className="text-sm text-gray-500 mt-1">
            Share your experience with DonClaudio&apos;s. Reviews appear on the
            homepage once approved.
          </p>
        </div>
      </div>

      {/* Submit review */}
      <div className="rounded-2xl bg-white shadow p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Leave a Review</h3>
        <p className="text-sm text-gray-500 mb-4">
          You can review after completing at least one order.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Rating
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Review
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Tell us about your experience..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-[#2d4a35] hover:bg-[#3a5c44] text-white"
        >
          {createMutation.isPending ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>

      {/* My reviews list */}
      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading your reviews...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load your reviews.
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          You haven&apos;t submitted any reviews yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review._id} className="rounded-2xl bg-white shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <StarRating value={review.rating} onChange={() => {}} disabled />
                </div>
                {statusBadge(review)}
              </div>

              <p className="text-sm text-gray-700 mt-3">
                &ldquo;{review.comment}&rdquo;
              </p>

              <p className="text-xs text-gray-400 mt-2">
                {review.createdAt
                  ? new Date(review.createdAt).toLocaleDateString()
                  : ''}
              </p>

              {review.reply && (
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    DonClaudio&apos;s Team Response
                  </p>
                  <p className="text-sm text-gray-700">
                    &ldquo;{review.reply}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
