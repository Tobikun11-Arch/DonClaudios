'use client';

import {useState} from 'react';
import {Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

export default function GuestIdentityForm({
  submitting,
  onSubmit
}: {
  submitting?: boolean;
  onSubmit: (data: {name: string; contact: string}) => void;
}) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const canSubmit =
    name.trim().length > 0 && contact.trim().length > 0 && !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({name: name.trim(), contact: contact.trim()});
  };

  return (
    <div className="px-4 py-6">
      <p className="text-sm font-semibold text-gray-900">
        Tell us who you are
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Enter your name and a phone or email so we can get back to you.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="guest-name" className="text-xs text-gray-600">
            Name
          </Label>
          <Input
            id="guest-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Juan Dela Cruz"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-contact" className="text-xs text-gray-600">
            Phone or Email
          </Label>
          <Input
            id="guest-contact"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="09xx-xxx-xxxx or email@example.com"
            className="h-9"
          />
        </div>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full gap-1.5 bg-[#2d4a35] hover:bg-[#3a5c44]"
        >
          <Send size={14} />
          Start Chat
        </Button>
      </form>
    </div>
  );
}