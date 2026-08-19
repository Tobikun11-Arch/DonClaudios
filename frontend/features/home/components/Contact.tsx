'use client';

import {Phone, MapPin, Mail, Clock} from 'lucide-react';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {ContactSection, Colors} from '@/lib/types/settings';

interface Props {
  contact?: ContactSection;
  colors?: Colors;
}

export default function ContactSection({
  contact = DEFAULT_SETTINGS.contact,
  colors
}: Props) {
  const c = colors ?? DEFAULT_SETTINGS.colors;

  return (
    <section
      id="contact"
      className="min-h-screen flex items-center py-16 sm:py-20 px-4"
      style={{backgroundColor: 'color-mix(in srgb, #fbd897 12%, white)'}}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10 sm:mb-16">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4"
            style={{color: c.primary}}
          >
            Get In Touch
          </h2>
          <p
            className="text-base sm:text-xl"
            style={{color: c.primary}}
          >
            Ready to order? Have questions? We&apos;re here to help!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3
                className="text-xl sm:text-2xl font-bold mb-1"
                style={{color: c.primary}}
              >
                Talk to us
              </h3>
              <p
                className="text-xs sm:text-sm"
                style={{color: `${c.primary}99`}}
              >
                Orders, inquiries, or bulk catering - we respond fast.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <div
                  className="p-2 sm:p-2.5 rounded-xl shrink-0"
                  style={{backgroundColor: c.accent}}
                >
                  <Phone
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{color: c.primary}}
                  />
                </div>
                <div>
                  <h4
                    className="font-bold mb-1 text-sm sm:text-base"
                    style={{color: c.primary}}
                  >
                    Call
                  </h4>
                  {contact.phones.map((phone, i) => (
                    <p
                      key={i}
                      className="text-xs sm:text-sm"
                      style={{color: c.primary}}
                    >
                      {phone}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div
                  className="p-2 sm:p-2.5 rounded-xl shrink-0"
                  style={{backgroundColor: c.primary}}
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h4
                    className="font-bold mb-1 text-sm sm:text-base"
                    style={{color: c.primary}}
                  >
                    Email
                  </h4>
                  <p
                    className="text-xs sm:text-sm break-all"
                    style={{color: c.primary}}
                  >
                    {contact.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div
                  className="p-2 sm:p-2.5 rounded-xl shrink-0"
                  style={{backgroundColor: c.primary}}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h4
                    className="font-bold mb-1 text-sm sm:text-base"
                    style={{color: c.primary}}
                  >
                    Hours
                  </h4>
                  <p
                    className="text-xs sm:text-sm"
                    style={{color: c.primary}}
                  >
                    {contact.hours}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div
                  className="p-2 sm:p-2.5 rounded-xl shrink-0"
                  style={{backgroundColor: c.accent}}
                >
                  <MapPin
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{color: c.primary}}
                  />
                </div>
                <div>
                  <h4
                    className="font-bold mb-1 text-sm sm:text-base"
                    style={{color: c.primary}}
                  >
                    Address
                  </h4>
                  <p
                    className="text-xs sm:text-sm"
                    style={{color: c.primary}}
                  >
                    {contact.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl h-100 sm:h-125 md:h-150 lg:h-162.5">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2422.9406044231473!2d120.8530823121149!3d14.39092185435405!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33962d2a919119a5%3A0xe5f912eb02ffd2f9!2sDon%20Claudio%E2%80%99s%20Lechon%20House!5e0!3m2!1sen!2sus!4v1775444344003!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{border: 0}}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="DonClaudio's Location"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
