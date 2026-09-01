'use client';

import {Star} from 'lucide-react';
import {useMyReviewsQuery} from '@/lib/hooks/reviews/useReviews';

export default function CustomerNotifications() {
  const {data, isLoading, isError} = useMyReviewsQuery();
  const reviews = data?.reviews ?? [];

  const replyNotifications = reviews.filter(
    review => review.reply && review.reply.trim().length > 0
  );

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            Replies and updates from the DonClaudio&apos;s team.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading notifications...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load notifications.
        </div>
      ) : replyNotifications.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          You have no notifications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {replyNotifications.map(review => (
            <div
              key={review._id}
              className="rounded-2xl bg-white shadow p-5 flex gap-4"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  DonClaudio&apos;s replied to your review
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {review.replyDate
                    ? new Date(review.replyDate).toLocaleString()
                    : ''}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  &ldquo;{review.reply}&rdquo;
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Your review: &ldquo;{review.comment}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
