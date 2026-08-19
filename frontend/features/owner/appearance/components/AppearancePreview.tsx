'use client';

import {useState, useCallback} from 'react';
import Image from 'next/image';
import {Star, Phone, MapPin, Mail, Clock} from 'lucide-react';
import {toast} from 'sonner';
import EditableText from './EditableText';
import ColorPickerPanel from './ColorPickerPanel';
import {useSettingsQuery, useUpdateSettingsMutation} from '@/lib/hooks/useSettings';
import type {SiteSetting, Colors} from '@/lib/types/settings';

export default function AppearancePreview() {
  const {data: settings} = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  const [local, setLocal] = useState<SiteSetting | null>(null);

  const data = local ?? settings;

  const save = useCallback(
    async (patch: Partial<SiteSetting>) => {
      setLocal(prev => ({...(prev ?? settings!), ...patch}));
      try {
        await updateMutation.mutateAsync(patch);
        setLocal(null);
        toast.success('Saved');
      } catch (err: unknown) {
        console.error('Save failed:', err);
        setLocal(null);
        const msg = err instanceof Error ? err.message : 'Save failed — backend may be offline';
        toast.error(msg);
      }
    },
    [settings, updateMutation]
  );

  const saveHero = useCallback(
    async (field: string, value: string) => {
      await save({hero: {...data!.hero, [field]: value}});
    },
    [data, save]
  );

  const saveHeroStat = useCallback(
    async (index: number, field: 'value' | 'label', value: string) => {
      const stats = [...data!.hero.stats];
      stats[index] = {...stats[index], [field]: value};
      await save({hero: {...data!.hero, stats}});
    },
    [data, save]
  );

  const saveHighlights = useCallback(
    async (field: string, value: string) => {
      await save({highlights: {...data!.highlights, [field]: value}});
    },
    [data, save]
  );

  const saveAbout = useCallback(
    async (field: string, value: string) => {
      await save({about: {...data!.about, [field]: value}});
    },
    [data, save]
  );

  const saveAboutStat = useCallback(
    async (index: number, field: 'value' | 'label', value: string) => {
      const stats = [...data!.about.stats];
      stats[index] = {...stats[index], [field]: value};
      await save({about: {...data!.about, stats}});
    },
    [data, save]
  );

  const saveReviews = useCallback(
    async (field: string, value: string) => {
      await save({reviews: {...data!.reviews, [field]: value}});
    },
    [data, save]
  );

  const saveContact = useCallback(
    async (field: string, value: string) => {
      await save({contact: {...data!.contact, [field]: value}});
    },
    [data, save]
  );

  const saveContactPhone = useCallback(
    async (index: number, value: string) => {
      const phones = [...data!.contact.phones];
      phones[index] = value;
      await save({contact: {...data!.contact, phones}});
    },
    [data, save]
  );

  const saveFooter = useCallback(
    async (field: string, value: string) => {
      await save({footer: {...data!.footer, [field]: value}});
    },
    [data, save]
  );

  const saveFooterPhone = useCallback(
    async (index: number, value: string) => {
      const phones = [...data!.footer.phones];
      phones[index] = value;
      await save({footer: {...data!.footer, phones}});
    },
    [data, save]
  );

  const handleColorsChange = useCallback(
    async (colors: Colors) => {
      setLocal(prev => ({...(prev ?? settings!), colors}));
      try {
        await updateMutation.mutateAsync({colors});
      } catch {
        setLocal(null);
      }
    },
    [settings, updateMutation]
  );

  if (!data) {
    return (
      <div className="space-y-6 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        '--color-primary': data.colors.primary,
        '--color-accent': data.colors.accent,
        '--color-muted': data.colors.muted,
        '--color-bg': data.colors.lightGreen
      } as React.CSSProperties}
    >
      {/* ── Hero ── */}
      <section
        className="min-h-screen flex items-center px-4 pt-20 pb-10 relative overflow-hidden"
        style={{backgroundColor: data.colors.primary}}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl" style={{backgroundColor: data.colors.accent}} />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl bg-[#a4bbab]" />
        </div>

        <div className="container mx-auto relative z-10 pt-4 lg:pt-0">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 lg:space-y-8 text-white">
              <div className="flex flex-wrap items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1 text-xs sm:text-sm font-medium">Loved by locals in Tanza</span>
              </div>

              <h2 className="text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <EditableText
                  value={data.hero.title}
                  onSave={v => saveHero('title', v)}
                  tag="span"
                  className="text-white"
                />
              </h2>

              <p className="text-base sm:text-xl text-white/90 max-w-lg">
                <EditableText
                  value={data.hero.subtitle}
                  onSave={v => saveHero('subtitle', v)}
                  tag="span"
                  className="text-white"
                />
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  className="px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold rounded-lg"
                  style={{backgroundColor: data.colors.accent, color: data.colors.primary}}
                >
                  <EditableText
                    value={data.hero.ctaText}
                    onSave={v => saveHero('ctaText', v)}
                    tag="span"
                  />
                </button>
              </div>

              <div className="flex items-center gap-6 sm:gap-12 pt-6 border-t border-white/20">
                {data.hero.stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-2xl sm:text-3xl font-bold" style={{color: data.colors.accent}}>
                      <EditableText
                        value={stat.value}
                        onSave={v => saveHeroStat(i, 'value', v)}
                        tag="span"
                        className="text-inherit"
                      />
                    </p>
                    <p className="text-xs sm:text-sm text-white/70">
                      <EditableText
                        value={stat.label}
                        onSave={v => saveHeroStat(i, 'label', v)}
                        tag="span"
                        className="text-white/70"
                      />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full h-75 sm:h-100 lg:h-150 rounded-3xl overflow-hidden">
                <Image src="/assets/hero_image.JPG" alt="Delicious Lechon" fill className="object-cover" />
              </div>
              <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm mb-1 text-[#a4bbab]">Opening Hours</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{color: data.colors.primary}}>
                      10AM - 10PM
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm mb-1 text-[#a4bbab]">Days</p>
                    <p className="text-sm sm:text-base font-bold" style={{color: data.colors.primary}}>
                      Tue - Sun
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Highlights ── */}
      <section className="min-h-screen flex items-center py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-5xl font-bold mb-4" style={{color: data.colors.primary}}>
              <EditableText
                value={data.highlights.title}
                onSave={v => saveHighlights('title', v)}
                tag="span"
              />
            </h2>
            <p className="text-xl" style={{color: '#a4bbab'}}>
              <EditableText
                value={data.highlights.subtitle}
                onSave={v => saveHighlights('subtitle', v)}
                tag="span"
              />
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl h-125">
              <Image src="/assets/highlights1.JPG" alt="Restaurant Interior" fill className="object-cover" priority />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent flex items-end p-8">
                <div className="text-white">
                  <h3 className="text-3xl font-bold mb-2">Lechon House</h3>
                  <p className="text-lg text-white/90">Located in Daang Amaya, Tanza Cavite</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl h-60">
                <Image src="/assets/Highlight2.png" alt="Dining Area" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                  <h3 className="text-white text-xl font-bold">Walkin&apos; Order</h3>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl h-60">
                <Image src="/assets/Highlights3.png" alt="Our Specialty" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                  <h3 className="text-white text-xl font-bold">Crispy Perfection</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Promo ── */}
      <section className="min-h-screen flex items-center py-20 px-4 bg-[#fbd897]">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-5xl font-bold mb-4" style={{color: data.colors.primary}}>
              <EditableText
                value={data.promo.title}
                onSave={v => save({promo: {...data!.promo, title: v}})}
                tag="span"
              />
            </h2>
            <p className="text-xl" style={{color: data.colors.primary}}>
              <EditableText
                value={data.promo.subtitle}
                onSave={v => save({promo: {...data!.promo, subtitle: v}})}
                tag="span"
              />
            </p>
          </div>

          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Promo cards are managed in the Promos tab.</p>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="min-h-screen flex items-center py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold" style={{color: data.colors.primary}}>
                <EditableText
                  value={data.about.title}
                  onSave={v => saveAbout('title', v)}
                  tag="span"
                />
              </h2>
              <div className="space-y-4 text-lg" style={{color: data.colors.primary}}>
                <p>
                  <EditableText
                    value={data.about.description}
                    onSave={v => saveAbout('description', v)}
                    tag="span"
                  />
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                {data.about.stats.map((stat, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl"
                    style={{backgroundColor: i === 0 ? data.colors.accent : '#a4bbab'}}
                  >
                    <p className="text-3xl font-bold mb-1" style={{color: i === 0 ? data.colors.primary : 'white'}}>
                      <EditableText
                        value={stat.value}
                        onSave={v => saveAboutStat(i, 'value', v)}
                        tag="span"
                      />
                    </p>
                    <p className="text-sm" style={{color: i === 0 ? data.colors.primary : 'white'}}>
                      <EditableText
                        value={stat.label}
                        onSave={v => saveAboutStat(i, 'label', v)}
                        tag="span"
                      />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl" />
              <div className="relative w-full h-150 rounded-3xl overflow-hidden">
                <Image src="/assets/ourstory.JPG" alt="About DonClaudio's" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section
        className="min-h-screen flex items-center py-20 px-4"
        style={{backgroundColor: `color-mix(in srgb, ${data.colors.primary} 12%, white)`}}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest uppercase text-[#6b8a6e] mb-2">
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{color: data.colors.primary}}>
              <EditableText
                value={data.reviews.heading}
                onSave={v => saveReviews('heading', v)}
                tag="span"
              />
            </h2>
            <p className="text-base sm:text-xl" style={{color: data.colors.primary}}>
              <EditableText
                value={data.reviews.subheading}
                onSave={v => saveReviews('subheading', v)}
                tag="span"
              />
            </p>
          </div>

          {/* Desktop & Tablet: split layout */}
          <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
            {/* Left: photo + featured review */}
            <div className="lg:col-span-2 relative rounded-2xl overflow-hidden min-h-80 bg-[#a4bbab]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8aab8e] to-[#6b8a6e]" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg">
                <span className="text-5xl font-serif text-[#6b8a6e]/40 leading-none select-none">&ldquo;</span>
                <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed -mt-2 mb-3">
                  {data.reviews.featured.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {data.reviews.featured.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{data.reviews.featured.name}</p>
                    <p className="text-xs text-gray-500">{data.reviews.featured.tag}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: 2x2 grid */}
            <div className="lg:col-span-3 grid sm:grid-cols-2 auto-rows-fr gap-4 sm:gap-5">
              {data.reviews.items.map((review, i) => (
                <div key={i} className="bg-white/80 rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col h-full">
                  <div className="flex gap-0.5">
                    {Array.from({length: review.rating}).map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm sm:text-base lg:text-lg leading-relaxed flex-1 mt-4 mb-6">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {review.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{review.name}</p>
                        <p className="text-xs text-gray-500">{review.tag}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="md:hidden space-y-5">
            <div className="relative rounded-2xl overflow-hidden h-72 bg-[#a4bbab]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8aab8e] to-[#6b8a6e]" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <span className="text-4xl font-serif text-[#6b8a6e]/40 leading-none select-none">&ldquo;</span>
                <p className="text-sm text-gray-800 italic leading-relaxed -mt-1 mb-3">
                  {data.reviews.featured.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {data.reviews.featured.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{data.reviews.featured.name}</p>
                    <p className="text-xs text-gray-500">{data.reviews.featured.tag}</p>
                  </div>
                </div>
              </div>
            </div>

            {data.reviews.items.map((review, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col h-full">
                <div className="flex gap-0.5">
                  {Array.from({length: review.rating}).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm sm:text-base lg:text-lg leading-relaxed flex-1 mt-4 mb-6">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{review.name}</p>
                      <p className="text-xs text-gray-500">{review.tag}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="min-h-screen flex items-center py-16 sm:py-20 px-4 bg-[#e8dcc4]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4" style={{color: data.colors.primary}}>
              Get In Touch
            </h2>
            <p className="text-base sm:text-xl" style={{color: data.colors.primary}}>
              Ready to order? Have questions? We&apos;re here to help!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1" style={{color: data.colors.primary}}>Talk to us</h3>
                <p className="text-xs sm:text-sm" style={{color: `${data.colors.primary}99`}}>
                  Orders, inquiries, or bulk catering - we respond fast.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{backgroundColor: data.colors.accent}}>
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" style={{color: data.colors.primary}} />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-sm sm:text-base" style={{color: data.colors.primary}}>Call</h4>
                    {data.contact.phones.map((phone, i) => (
                      <p key={i} className="text-xs sm:text-sm" style={{color: data.colors.primary}}>
                        <EditableText value={phone} onSave={v => saveContactPhone(i, v)} tag="span" />
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{backgroundColor: data.colors.primary}}>
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-sm sm:text-base" style={{color: data.colors.primary}}>Email</h4>
                    <p className="text-xs sm:text-sm break-all" style={{color: data.colors.primary}}>
                      <EditableText
                        value={data.contact.email}
                        onSave={v => saveContact('email', v)}
                        tag="span"
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{backgroundColor: data.colors.primary}}>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-sm sm:text-base" style={{color: data.colors.primary}}>Hours</h4>
                    <p className="text-xs sm:text-sm" style={{color: data.colors.primary}}>
                      <EditableText
                        value={data.contact.hours}
                        onSave={v => saveContact('hours', v)}
                        tag="span"
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{backgroundColor: data.colors.accent}}>
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" style={{color: data.colors.primary}} />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-sm sm:text-base" style={{color: data.colors.primary}}>Address</h4>
                    <p className="text-xs sm:text-sm" style={{color: data.colors.primary}}>
                      <EditableText
                        value={data.contact.address}
                        onSave={v => saveContact('address', v)}
                        tag="span"
                      />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl h-100 sm:h-125 md:h-150">
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

      {/* ── Footer ── */}
      <footer className="mt-auto py-12 text-white" style={{backgroundColor: data.colors.primary}}>
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-xl mb-4" style={{color: data.colors.accent}}>
                <EditableText
                  value={data.footer.brandName}
                  onSave={v => saveFooter('brandName', v)}
                  tag="span"
                  className="text-inherit"
                />
              </h3>
              <p className="text-sm opacity-90 mb-4">
                <EditableText
                  value={data.footer.description}
                  onSave={v => saveFooter('description', v)}
                  tag="span"
                />
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  <EditableText
                    value={data.footer.hours}
                    onSave={v => saveFooter('hours', v)}
                    tag="span"
                  />
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4" style={{color: data.colors.accent}}>Contact Us</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-1 shrink-0" />
                  <div>
                    {data.footer.phones.map((phone, i) => (
                      <p key={i}>
                        <EditableText value={phone} onSave={v => saveFooterPhone(i, v)} tag="span" />
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-1 shrink-0" />
                  <p>
                    <EditableText
                      value={data.footer.email}
                      onSave={v => saveFooter('email', v)}
                      tag="span"
                    />
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4" style={{color: data.colors.accent}}>Location</h4>
              <div className="flex items-start gap-2 text-sm mb-4">
                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                <p>
                  <EditableText
                    value={data.footer.address}
                    onSave={v => saveFooter('address', v)}
                    tag="span"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm opacity-75">
              &copy; 2026 {data.footer.brandName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <ColorPickerPanel colors={data.colors} onChange={handleColorsChange} />
    </div>
  );
}
