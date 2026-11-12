'use client';

import {Bot, Check, CheckCheck, Clock, RotateCw} from 'lucide-react';
import type {SupportMessage} from '@/lib/api/supportApi';
import {inquiryChipClass, inquiryLabel} from '@/lib/support/inquiry';

export default function SupportMessageBubble({
  message,
  pending,
  failed,
  onRetry,
  flip = false
}: {
  message: SupportMessage;
  pending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  /** true in the owner view (owner messages on the right). */
  flip?: boolean;
}) {
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      })
    : '';

  // Automatic acknowledgement from the inquiry queue.
  if (message.senderType === 'system') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[92%] rounded-xl border border-dashed border-[#6b8a6e]/50 bg-[#eef4ef] px-3 py-2 text-[#2d4a35] dark:border-[#7ed4a0]/30 dark:bg-[#7ed4a0]/10 dark:text-[#b8e6c8]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
            <Bot size={12} />
            Auto-reply
            <span className="font-normal normal-case opacity-70">{time}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed whitespace-pre-wrap">
            {message.body}
          </p>
        </div>
      </div>
    );
  }

  const isOwner = message.senderType === 'owner';
  const onRight = flip ? isOwner : !isOwner;
  const isInquiry = message.senderType === 'customer' && !!message.inquiryStatus;
  const isUrgent = message.priority === 'urgent';

  return (
    <div className={`flex ${onRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          onRight
            ? 'bg-[#2d4a35] text-white'
            : 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
        } ${pending ? 'opacity-70' : ''} ${
          isUrgent && flip ? 'ring-2 ring-red-400' : ''
        }`}
      >
        <div className="flex items-center gap-1.5">
          {failed && (
            <button
              onClick={onRetry}
              className="shrink-0 rounded-full p-0.5 text-[#f08080] hover:bg-[#f08080]/20"
              aria-label="Retry sending message"
            >
              <RotateCw size={12} />
            </button>
          )}
          {pending && !failed && (
            <Clock size={12} className="shrink-0 opacity-70" />
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-wide ${
              onRight ? 'text-[#b8d4c0]' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isOwner
              ? flip && message.senderName
                ? message.senderName
                : "DonClaudio's"
              : message.senderName || 'Customer'}
          </span>
          <span
            className={`text-[10px] ${
              onRight ? 'text-[#b8d4c0]' : 'text-gray-400'
            }`}
          >
            {time}
          </span>
        </div>
        <p className="mt-0.5 text-sm whitespace-pre-wrap">{message.body}</p>

        {isInquiry && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${inquiryChipClass(
                isUrgent ? 'urgent' : message.category
              )}`}
            >
              {isUrgent && message.category !== 'urgent'
                ? `🚨 Urgent · ${inquiryLabel(message.category).replace(/^\S+\s/, '')}`
                : inquiryLabel(message.category)}
            </span>
            {flip && message.autoFlagged && (
              <span
                className="rounded-full border border-red-200 bg-white px-1.5 py-px text-[9px] font-semibold text-red-600 dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
                title={`Matched: ${(message.matchedKeywords ?? []).join(', ')}`}
              >
                auto-flagged
              </span>
            )}
            <span
              className={`ml-auto flex items-center gap-0.5 text-[9px] font-semibold ${
                onRight ? 'text-[#b8d4c0]' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {message.inquiryStatus === 'answered' ? (
                <>
                  <CheckCheck size={11} /> Answered
                </>
              ) : message.inquiryStatus === 'customer_closed' ? (
                <>
                  <Check size={11} /> Closed by customer
                </>
              ) : (
                <>
                  <Check size={11} /> Pending
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
