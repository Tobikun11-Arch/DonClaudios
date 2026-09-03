'use client';

import {useRef, useState} from 'react';
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
  const [pendingMessages, setPendingMessages] = useState<OrderMessage[]>([]);
  const tempIdCounter = useRef(0);

  const allMessages = [
    ...messages,
    ...pendingMessages.filter(
      pm => !messages.some(m => m.authorType === pm.authorType && m.body === pm.body)
    )
  ];

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text) return;
    const tempId = `temp-${++tempIdCounter.current}`;
    const tempMessage: OrderMessage = {
      _id: tempId,
      orderId: '',
      authorType: teamOnRight ? 'admin' : 'customer',
      senderName: teamOnRight ? "DonClaudio's Team" : 'You',
      body: text,
      createdAt: new Date().toISOString()
    };
    setPendingMessages(prev => [...prev, tempMessage]);
    setDraft('');
    await onSubmit(text);
    setPendingMessages(prev => prev.filter(m => m._id !== tempId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      {allMessages.length > 0 && (
        <div className="space-y-2.5">
          {allMessages.map(message => (
            <MessageBubble
              key={message._id}
              message={message}
              teamOnRight={teamOnRight}
              sending={message._id.startsWith('temp-')}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={placeholder}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
        />
        <Button
          onClick={handleSubmit}
          disabled={sending || !draft.trim()}
          size="icon"
          className="bg-[#2d4a35] hover:bg-[#3a5c44] text-white shrink-0"
          aria-label="Send message"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  teamOnRight,
  sending
}: {
  message: OrderMessage;
  teamOnRight: boolean;
  sending?: boolean;
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
        } ${sending ? 'opacity-70' : ''}`}
      >
        <p
          className={`text-xs font-bold mb-0.5 ${
            onRight ? 'text-[#b8d4c0]' : 'text-gray-500'
          }`}
        >
          {isTeam ? "DonClaudio's Team" : message.senderName || 'You'}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        {!sending && (
          <p
            className={`mt-1 text-[10px] ${
              onRight ? 'text-[#b8d4c0]' : 'text-gray-400'
            }`}
          >
            {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
          </p>
        )}
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
