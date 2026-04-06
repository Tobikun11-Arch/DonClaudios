import React from 'react';
import {MapPin, Phone, Mail, MessageCircle, Clock} from 'lucide-react';

export default function Footer() {
  return (
    <footer
      className="mt-auto py-12 text-white bg-[#3c5e45]"
    >
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-xl mb-4 text-[#fbd897]">
              DonClaudio&apos;s Lechon House
            </h3>
            <p className="text-sm opacity-90 mb-4">
              The place of extraordinary taste of Lechon and great food —
              DonClaudio&apos;s!
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Open: 10:00 AM - 10:00 PM (Tue-Sun)</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-[#fbd897]">
              Contact Us
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-1 shrink-0" />
                <div>
                  <p>09155321169</p>
                  <p>09392587229</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-1 shrink-0" />
                <p>lcnpau@yahoo.com</p>
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
            <h4 className="font-bold mb-4 text-[#fbd897]">
              Location
            </h4>
            <div className="flex items-start gap-2 text-sm mb-4">
              <MapPin className="w-4 h-4 mt-1 shrink-0" />
              <p>
                Jasmine St. De Roman Brgy.Daang Amaya 1<br />
                Tanza, Cavite, Philippines 4108
              </p>
            </div>
            <p className="text-sm opacity-90">
              📍 Search &apos;DonClaudio&apos;s Lechon House&apos; on Google
              Maps / Waze
            </p>
          </div>
        </div>

        <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm opacity-75">
            © 2026 DonClaudio&apos;s Lechon House. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
