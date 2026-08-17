import React from 'react';
import {MapPin, Phone, Mail, MessageCircle, Clock} from 'lucide-react';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {FooterSection, Colors} from '@/lib/types/settings';

interface Props {
  footer?: FooterSection;
  colors?: Colors;
}

export default function Footer({
  footer = DEFAULT_SETTINGS.footer,
  colors
}: Props) {
  const c = colors ?? DEFAULT_SETTINGS.colors;

  return (
    <footer className="mt-auto py-12 text-white" style={{backgroundColor: c.primary}}>
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3
              className="font-bold text-xl mb-4"
              style={{color: c.accent}}
            >
              {footer.brandName}
            </h3>
            <p className="text-sm opacity-90 mb-4">{footer.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>{footer.hours}</span>
            </div>
          </div>

          <div>
            <h4
              className="font-bold mb-4"
              style={{color: c.accent}}
            >
              Contact Us
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-1 shrink-0" />
                <div>
                  {footer.phones.map((phone, i) => (
                    <p key={i}>{phone}</p>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-1 shrink-0" />
                <p>{footer.email}</p>
              </div>
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 mt-1 shrink-0" />
                <a
                  href="https://www.facebook.com/messages/t/DONCLAUDIOSLECHONHOUSE/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Facebook Messenger
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4
              className="font-bold mb-4"
              style={{color: c.accent}}
            >
              Location
            </h4>
            <div className="flex items-start gap-2 text-sm mb-4">
              <MapPin className="w-4 h-4 mt-1 shrink-0" />
              <p>{footer.address}</p>
            </div>
            <p className="text-sm opacity-90">
              Search &apos;DonClaudio&apos;s Lechon House&apos; on Google Maps /
              Waze
            </p>
          </div>
        </div>

        <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm opacity-75">
            &copy; 2026 {footer.brandName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
