'use client';

import {Phone, MapPin, Mail, Clock} from 'lucide-react';
import {Button} from '@/components/ui/button';

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="min-h-screen flex items-center py-16 sm:py-20 px-4 bg-[#e8dcc4]"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-[#3c5e45]">
            Get In Touch
          </h2>
          <p className="text-base sm:text-xl text-[#3c5e45]">
            Ready to order? Have questions? We&apos;re here to help!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#3c5e45] mb-1">
                Talk to us
              </h3>
              <p className="text-[#3c5e45]/70 text-xs sm:text-sm">
                Orders, inquiries, or bulk catering - we respond fast.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="bg-[#fbd897] p-2 sm:p-2.5 rounded-xl shrink-0">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-[#3c5e45]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#3c5e45] mb-1 text-sm sm:text-base">
                    Call
                  </h4>
                  <p className="text-xs sm:text-sm text-[#3c5e45]">
                    +63 915 5321 169
                  </p>
                  <p className="text-xs sm:text-sm text-[#3c5e45]">
                    +63 939 2587 229
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="bg-[#3c5e45] p-2 sm:p-2.5 rounded-xl shrink-0">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[#3c5e45] mb-1 text-sm sm:text-base">
                    Email
                  </h4>
                  <p className="text-xs sm:text-sm text-[#3c5e45] break-all">
                    support@donclaudio.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="bg-[#3c5e45] p-2 sm:p-2.5 rounded-xl shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[#3c5e45] mb-1 text-sm sm:text-base">
                    Hours
                  </h4>
                  <p className="text-xs sm:text-sm text-[#3c5e45]">Tue - Sun</p>
                  <p className="text-xs sm:text-sm text-[#3c5e45]">
                    10:00 AM - 10:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="bg-[#fbd897] p-2 sm:p-2.5 rounded-xl shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#3c5e45]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#3c5e45] mb-1 text-sm sm:text-base">
                    Address
                  </h4>
                  <p className="text-xs sm:text-sm text-[#3c5e45]">
                    Jasmine St. De Roman
                    <br />
                    Brgy.Daang Amaya 1,
                    <br />
                    Tanza, Philippines, 4108
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-[#3c5e45] text-sm sm:text-base">
                Send a quick message
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full name"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#3c5e45]/20 bg-transparent text-[#3c5e45] placeholder:text-[#3c5e45]/40 focus:outline-none focus:border-[#3c5e45]/50 text-sm"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#3c5e45]/20 bg-transparent text-[#3c5e45] placeholder:text-[#3c5e45]/40 focus:outline-none focus:border-[#3c5e45]/50 text-sm"
                />
              </div>
              <input
                type="tel"
                placeholder="Phone number"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#3c5e45]/20 bg-transparent text-[#3c5e45] placeholder:text-[#3c5e45]/40 focus:outline-none focus:border-[#3c5e45]/50 text-sm"
              />
              <textarea
                placeholder="Tell us about your concern"
                rows={4}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#3c5e45]/20 bg-transparent text-[#3c5e45] placeholder:text-[#3c5e45]/40 focus:outline-none focus:border-[#3c5e45]/50 text-sm resize-none"
              />
              <Button className="w-full sm:w-auto bg-transparent border border-[#3c5e45] text-[#3c5e45] hover:bg-[#3c5e45] hover:text-white px-8 py-3 rounded-xl font-semibold text-sm sm:text-base">
                Send Message
              </Button>
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
