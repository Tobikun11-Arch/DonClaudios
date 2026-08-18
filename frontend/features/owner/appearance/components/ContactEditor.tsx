'use client';

import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

type ContactEditorProps = {
  address: string;
  phone: string;
  email: string;
  hours: string;
  onChange: (field: string, value: string) => void;
};

export default function ContactEditor({
  address,
  phone,
  email,
  hours,
  onChange
}: ContactEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={phone}
            onChange={e => onChange('phone', e.target.value)}
            placeholder="+63 915 5321 169"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="support@donclaudio.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <textarea
          value={address}
          onChange={e => onChange('address', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y"
          placeholder="Jasmine St. De Roman&#10;Brgy.Daang Amaya 1&#10;Tanza, Philippines, 4108"
        />
      </div>
      <div className="space-y-2">
        <Label>Hours</Label>
        <Input
          value={hours}
          onChange={e => onChange('hours', e.target.value)}
          placeholder="Tue - Sun: 10:00 AM - 10:00 PM"
        />
      </div>
    </div>
  );
}
