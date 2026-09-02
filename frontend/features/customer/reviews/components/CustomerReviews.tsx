'use client';

import {useRef, useState} from 'react';
import {Star, Send, MessageCircle} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useCreateReviewMutation,
  useCustomerReplyReviewMutation,
  useMyReviewsQuery
} from '@/lib/hooks/reviews/useReviews';
import type {Review, ReviewMessage} from '@/lib/types/review';
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

function MessageBubble({
  message,
  sending
}: {
  message: ReviewMessage;
  sending?: boolean;
}) {
  const isTeam = message.authorType === 'admin';
  return (
    <div className={`flex ${isTeam ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isTeam
            ? 'bg-gray-100 text-gray-800 border border-gray-200'
            : 'bg-[#2d4a35] text-white'
        } ${sending ? 'opacity-70' : ''}`}
      >
        <p
          className={`text-xs font-bold mb-0.5 ${
            isTeam ? 'text-gray-500' : 'text-[#b8d4c0]'
          }`}
        >
          {isTeam ? "DonClaudio's Team" : message.senderName || 'You'}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        {sending && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[11px] italic opacity-80">Sending...</span>
            <span className="flex gap-0.5" aria-hidden>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                style={{animationDelay: '120ms'}}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                style={{animationDelay: '240ms'}}
              />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerReviews() {
  const {data, isLoading, isError} = useMyReviewsQuery();
  const createMutation = useCreateReviewMutation();
  const customerReplyMutation = useCustomerReplyReviewMutation();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingMessages, setPendingMessages] = useState<
    Record<string, ReviewMessage[]>
  >({});
  const tempIdCounter = useRef(0);

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

  const messagesFor = (review: Review): ReviewMessage[] => {
    if (review.messages && review.messages.length > 0) {
      return review.messages;
    }
    if (review.reply) {
      return [
        {
          _id: 'legacy',
          authorType: 'admin',
          senderName: "DonClaudio's Team",
          body: review.reply,
          createdAt: review.replyDate ?? review.updatedAt
        }
      ];
    }
    return [];
  };

  const submitReply = async (review: Review) => {
    const text = (drafts[review._id] ?? '').trim();
    if (!text) {
      toast.error('Reply cannot be empty.');
      return;
    }
    const tempId = `temp-${++tempIdCounter.current}`;
    const tempMessage: ReviewMessage = {
      _id: tempId,
      authorType: 'customer',
      senderName: 'You',
      body: text,
      createdAt: new Date().toISOString()
    };
    setPendingMessages(prev => ({
      ...prev,
      [review._id]: [...(prev[review._id] ?? []), tempMessage]
    }));
    setReplyingId(null);
    setDrafts(prev => ({...prev, [review._id]: ''}));
    const removeTemp = () =>
      setPendingMessages(prev => ({
        ...prev,
        [review._id]: (prev[review._id] ?? []).filter(m => m._id !== tempId)
      }));
    try {
      await customerReplyMutation.mutateAsync({
        id: review._id,
        body: {reply: text}
      });
      toast.success('Your reply was sent to DonClaudio\u2019s.');
      removeTemp();
    } catch (error) {
      removeTemp();
      toast.error((error as NormalizedApiError)?.message ?? 'Failed to send reply.');
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
          {reviews.map(review => {
            const messages = [
              ...messagesFor(review),
              ...(pendingMessages[review._id] ?? [])
            ];
            const hasPreviousMessage =
              review.reply || (review.messages && review.messages.length > 0);
            const isReplying = replyingId === review._id;
            const draft = drafts[review._id] ?? '';
            return (
              <div key={review._id} className="rounded-2xl bg-white shadow p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <StarRating value={review.rating} onChange={() => {}} disabled />
                  </div>
                </div>

                <p className="text-sm text-gray-700 mt-3">
                  &ldquo;{review.comment}&rdquo;
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString()
                    : ''}
                </p>

                {messages.length > 0 && (
                  <div className="mt-5 space-y-2.5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Conversation
                    </p>
                    {messages.map(message => (
                      <MessageBubble
                        key={message._id}
                        message={message}
                        sending={message._id.startsWith('temp-')}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-gray-100">
                  {!isReplying ? (
                    <Button
                      onClick={() => setReplyingId(review._id)}
                      variant="outline"
                      size="sm"
                      className="gap-2 text-[#2d4a35]"
                    >
                      <MessageCircle size={16} />
                      {draft.trim() || hasPreviousMessage
                        ? 'Continue Conversation'
                        : 'Reply to DonClaudio\u2019s'}
                    </Button>
                  ) : (
                    <div>
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={e =>
                          setDrafts(prev => ({
                            ...prev,
                            [review._id]: e.target.value
                          }))
                        }
                        rows={3}
                        maxLength={2000}
                        placeholder="Write your reply..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingId(null);
                            setDrafts(prev => ({...prev, [review._id]: ''}));
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => submitReply(review)}
                          disabled={customerReplyMutation.isPending}
                          className="bg-[#2d4a35] hover:bg-[#3a5c44] text-white gap-1.5"
                        >
                          <Send size={14} />
                          {customerReplyMutation.isPending
                            ? 'Sending...'
                            : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
