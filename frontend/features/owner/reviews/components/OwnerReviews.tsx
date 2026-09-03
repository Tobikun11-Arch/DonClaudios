'use client';

import {useMemo, useRef, useState} from 'react';
import {Star, Send, Mail, MailOpen} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useAdminReviewsQuery,
  useReplyReviewMutation,
  useUpdateReviewStatusMutation
} from '@/lib/hooks/reviews/useReviews';
import type {Review, ReviewMessage, ReviewStatus} from '@/lib/types/review';
import type {NormalizedApiError} from '@/lib/api/types';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {useScrollToHighlight} from '@/shared/hooks/useScrollToHighlight';

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

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function MessageBubble({
  message,
  sending
}: {
  message: ReviewMessage;
  sending?: boolean;
}) {
  const isAdmin = message.authorType === 'admin';
  const isMy = isAdmin;
  return (
    <div className={`flex ${isMy ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isMy
            ? 'bg-[#2d4a35] text-white'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        } ${sending ? 'opacity-70' : ''}`}
      >
        <p
          className={`text-xs font-bold mb-0.5 ${
            isMy ? 'text-[#b8d4c0]' : 'text-gray-500'
          }`}
        >
          {message.senderName}
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

export default function OwnerReviews() {
  const {data, isLoading, isError} = useAdminReviewsQuery();
  const updateStatus = useUpdateReviewStatusMutation();
  const replyMutation = useReplyReviewMutation();

  const [filter, setFilter] = useState<Filter>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingMessages, setPendingMessages] = useState<
    Record<string, ReviewMessage[]>
  >({});
  const tempIdCounter = useRef(0);
  useScrollToHighlight();

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

  const submitReply = async (review: Review) => {
    const text = (drafts[review._id] ?? '').trim();
    if (!text) {
      toast.error('Reply cannot be empty.');
      return;
    }
    const tempId = `temp-${++tempIdCounter.current}`;
    const tempMessage: ReviewMessage = {
      _id: tempId,
      authorType: 'admin',
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
      await replyMutation.mutateAsync({
        id: review._id,
        body: {reply: text}
      });
      toast.success('Reply sent. Customer notified.');
      removeTemp();
    } catch (error) {
      removeTemp();
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
          {reviews.map(review => {
            const messages = [
              ...messagesFor(review),
              ...(pendingMessages[review._id] ?? [])
            ];
            const isReplying = replyingId === review._id;
            const draft = drafts[review._id] ?? '';
            return (
              <div key={review._id} id={`review-${review._id}`} className="rounded-2xl bg-white shadow p-6">
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
                      {formatDate(review.createdAt)}
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
                  </div>
                </div>

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
                      {draft.trim() || review.reply ? (
                        <MailOpen size={16} />
                      ) : (
                        <Mail size={16} />
                      )}
                      {draft.trim() || review.reply ? 'Edit Reply' : 'Reply'}
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
                          disabled={replyMutation.isPending}
                          className="bg-[#2d4a35] hover:bg-[#3a5c44] text-white gap-1.5"
                        >
                          <Send size={14} />
                          {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
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
