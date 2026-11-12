'use client';

import {useState} from 'react';
import {Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {sanitizeName} from '@/lib/validation/numeric';
import {normalizePH} from '@/lib/phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Same rule the backend enforces: a PH mobile number or an email address. */
function contactError(contact: string): string | null {
  const v = contact.trim();
  if (!v) return null;
  if (normalizePH(v) || EMAIL_RE.test(v)) return null;
  return 'Enter a valid PH mobile number (e.g. 09171234567) or email.';
}

export default function GuestIdentityForm({
  submitting,
  onSubmit
}: {
  submitting?: boolean;
  onSubmit: (data: {name: string; contact: string; website: string}) => void;
}) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [touched, setTouched] = useState(false);
  // Anti-spam honeypot: hidden from people, bots tend to fill it.
  const [website, setWebsite] = useState('');

  const cError = contactError(contact);
  const nameOk = name.trim().length >= 2;
  const canSubmit =
    nameOk && contact.trim().length > 0 && !cError && !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({name: name.trim(), contact: contact.trim(), website});
  };

  return (
    <div className="px-4 py-6">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Tell us who you are
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Enter your name and a phone or email so we can get back to you.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
        <div
          aria-hidden="true"
          style={{position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden'}}
        >
          <label htmlFor="support-website">Website</label>
          <input
            id="support-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-name" className="text-xs text-gray-600 dark:text-gray-300">
            Name
          </Label>
          <Input
            id="guest-name"
            value={name}
            maxLength={60}
            onChange={e => setName(sanitizeName(e.target.value))}
            placeholder="Juan Dela Cruz"
            className="h-9 dark:bg-gray-800 dark:text-gray-100"
          />
          {touched && !nameOk && (
            <p className="text-[11px] text-red-600">Please enter your name.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-contact" className="text-xs text-gray-600 dark:text-gray-300">
            Phone or Email
          </Label>
          <Input
            id="guest-contact"
            value={contact}
            maxLength={80}
            onChange={e => setContact(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="09xx-xxx-xxxx or email@example.com"
            aria-invalid={touched && !!cError}
            className="h-9 dark:bg-gray-800 dark:text-gray-100"
          />
          {touched && cError && (
            <p className="text-[11px] text-red-600">{cError}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full gap-1.5 bg-[#2d4a35] hover:bg-[#3a5c44]"
        >
          <Send size={14} />
          Start Chat
        </Button>
      </form>
    </div>
  );
}
