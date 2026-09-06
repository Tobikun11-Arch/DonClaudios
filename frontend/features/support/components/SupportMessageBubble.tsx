'use client';

import {Clock, RotateCw} from 'lucide-react';
import type {SupportMessage} from '@/lib/api/supportApi';

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
  flip?: boolean;
}) {
  const isOwner = message.senderType === 'owner';
  const onRight = flip ? isOwner : !isOwner;
  return (
    <div className={`flex ${onRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          onRight
            ? 'bg-[#2d4a35] text-white'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        } ${pending ? 'opacity-70' : ''}`}
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
              onRight ? 'text-[#b8d4c0]' : 'text-gray-500'
            }`}
          >
            {isOwner ? "DonClaudio's" : message.senderName || 'Customer'}
          </span>
          <span
            className={`text-[10px] ${
              onRight ? 'text-[#b8d4c0]' : 'text-gray-400'
            }`}
          >
            {message.createdAt
              ? new Date(message.createdAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit'
                })
              : ''}
          </span>
        </div>
        <p className="mt-0.5 text-sm whitespace-pre-wrap">{message.body}</p>
      </div>
    </div>
  );
}