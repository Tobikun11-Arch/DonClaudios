'use client';

import {useState} from 'react';
import {Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {OrderMessage} from '@/lib/api/orderApi';

export default function OrderChatThread({
  messages,
  sending,
  onSubmit,
  placeholder = 'Type your message...'
}: {
  messages: OrderMessage[];
  sending?: boolean;
  onSubmit: (text: string) => void;
  placeholder?: string;
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
            <MessageBubble key={message._id} message={message} />
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

function MessageBubble({message}: {message: OrderMessage}) {
  const isTeam = message.authorType === 'admin';
  return (
    <div className={`flex ${isTeam ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isTeam
            ? 'bg-gray-100 text-gray-800 border border-gray-200'
            : 'bg-[#2d4a35] text-white'
        }`}
      >
        <p
          className={`text-xs font-bold mb-0.5 ${
            isTeam ? 'text-gray-500' : 'text-[#b8d4c0]'
          }`}
        >
          {isTeam ? "DonClaudio's Team" : message.senderName || 'You'}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <p className={`mt-1 text-[10px] ${isTeam ? 'text-gray-400' : 'text-[#b8d4c0]'}`}>
          {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
        </p>
      </div>
    </div>
  );
}
