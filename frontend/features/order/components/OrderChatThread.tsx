'use client';

import {useState} from 'react';
import {Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {OrderMessage} from '@/lib/api/orderApi';

export default function OrderChatThread({
  messages,
  sending,
  onSubmit,
  placeholder = 'Type your message...',
  teamOnRight = false
}: {
  messages: OrderMessage[];
  sending?: boolean;
  onSubmit: (text: string) => void;
  placeholder?: string;
  teamOnRight?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    onSubmit(text);
    setDraft('');
  };

  return (
    <div>
      {messages.length > 0 && (
        <div className="space-y-2.5">
          {messages.map(message => (
            <MessageBubble
              key={message._id}
              message={message}
              teamOnRight={teamOnRight}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
        />
        <Button
          onClick={handleSubmit}
          disabled={sending || !draft.trim()}
          className="bg-[#2d4a35] hover:bg-[#3a5c44] text-white gap-1.5"
        >
          <Send size={14} />
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  teamOnRight
}: {
  message: OrderMessage;
  teamOnRight: boolean;
}) {
  const isTeam = message.authorType === 'admin';
  const onRight = teamOnRight ? isTeam : !isTeam;
  return (
    <div className={`flex ${onRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          onRight
            ? 'bg-[#2d4a35] text-white'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}
      >
        <p
          className={`text-xs font-bold mb-0.5 ${
            onRight ? 'text-[#b8d4c0]' : 'text-gray-500'
          }`}
        >
          {isTeam ? "DonClaudio's Team" : message.senderName || 'You'}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <p
          className={`mt-1 text-[10px] ${
            onRight ? 'text-[#b8d4c0]' : 'text-gray-400'
          }`}
        >
          {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
        </p>
      </div>
    </div>
  );
}
