'use client';

import {useCallback, useEffect, useState} from 'react';
import {useSettingsQuery, useUpdateSettingsMutation} from '@/lib/hooks/useSettings';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import SectionCard from '@/features/owner/appearance/components/SectionCard';
import HeroSectionEditor from '@/features/owner/appearance/components/HeroSectionEditor';
import HighlightsEditor from '@/features/owner/appearance/components/HighlightsEditor';
import AboutEditor from '@/features/owner/appearance/components/AboutEditor';
import ContactEditor from '@/features/owner/appearance/components/ContactEditor';
import ColorsEditor from '@/features/owner/appearance/components/ColorsEditor';
import {Button} from '@/components/ui/button';
import type {Colors, HeroStat, HighlightImage, AboutStat} from '@/lib/types/settings';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-4 w-72 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

function PageError({onRetry}: {onRetry: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-lg font-semibold text-gray-700 mb-2">
        Failed to load settings
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Something went wrong while fetching site settings.
      </p>
      <Button onClick={onRetry} variant="outline">
        Retry
      </Button>
    </div>
  );
}

export default function AppearancePage() {
  const settingsQuery = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();

  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settingsQuery.data?.settings && !loaded) {
      const s = settingsQuery.data.settings;
      setForm({
        hero: {
          title: s.hero?.title ?? DEFAULT_SETTINGS.hero.title,
          highlightedWord: s.hero?.highlightedWord ?? DEFAULT_SETTINGS.hero.highlightedWord,
          subtitle: s.hero?.subtitle ?? DEFAULT_SETTINGS.hero.subtitle,
          ctaText: s.hero?.ctaText ?? DEFAULT_SETTINGS.hero.ctaText,
          ctaLink: s.hero?.ctaLink ?? DEFAULT_SETTINGS.hero.ctaLink,
          backgroundImage: s.hero?.backgroundImage ?? DEFAULT_SETTINGS.hero.backgroundImage,
          stats: s.hero?.stats ?? DEFAULT_SETTINGS.hero.stats
        },
        highlights: {
          title: s.highlights?.title ?? DEFAULT_SETTINGS.highlights.title,
          images: s.highlights?.images ?? DEFAULT_SETTINGS.highlights.images
        },
        about: {
          title: s.about?.title ?? DEFAULT_SETTINGS.about.title,
          description: s.about?.description ?? DEFAULT_SETTINGS.about.description,
          stats: s.about?.stats ?? DEFAULT_SETTINGS.about.stats
        },
        contact: {
          address: s.contact?.address ?? DEFAULT_SETTINGS.contact.address,
          phone: s.contact?.phone ?? DEFAULT_SETTINGS.contact.phone,
          email: s.contact?.email ?? DEFAULT_SETTINGS.contact.email,
          hours: s.contact?.hours ?? DEFAULT_SETTINGS.contact.hours
        },
        colors: {
          primary: s.colors?.primary ?? DEFAULT_SETTINGS.colors.primary,
          accent: s.colors?.accent ?? DEFAULT_SETTINGS.colors.accent,
          muted: s.colors?.muted ?? DEFAULT_SETTINGS.colors.muted,
          darkGreen: s.colors?.darkGreen ?? DEFAULT_SETTINGS.colors.darkGreen,
          mediumGreen: s.colors?.mediumGreen ?? DEFAULT_SETTINGS.colors.mediumGreen,
          lightGreen: s.colors?.lightGreen ?? DEFAULT_SETTINGS.colors.lightGreen,
          beige: s.colors?.beige ?? DEFAULT_SETTINGS.colors.beige,
          red: s.colors?.red ?? DEFAULT_SETTINGS.colors.red
        }
      });
      setLoaded(true);
    }
  }, [settingsQuery.data, loaded]);

  const handleHeroChange = useCallback((field: string, value: unknown) => {
    setForm(prev => ({
      ...prev,
      hero: {...prev.hero, [field]: value}
    }));
  }, []);

  const handleHighlightsChange = useCallback((field: string, value: unknown) => {
    setForm(prev => ({
      ...prev,
      highlights: {...prev.highlights, [field]: value}
    }));
  }, []);

  const handleAboutChange = useCallback((field: string, value: unknown) => {
    setForm(prev => ({
      ...prev,
      about: {...prev.about, [field]: value}
    }));
  }, []);

  const handleContactChange = useCallback((field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      contact: {...prev.contact, [field]: value}
    }));
  }, []);

  const handleColorChange = useCallback((key: keyof Colors, value: string) => {
    setForm(prev => ({
      ...prev,
      colors: {...prev.colors, [key]: value}
    }));
  }, []);

  const handleSave = async () => {
    await updateMutation.mutateAsync(form);
  };

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS);
  };

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (settingsQuery.isError) {
    return <PageError onRetry={() => settingsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d4a35]">Site Appearance</h1>
          <p className="text-sm text-gray-500">
            Customize the content and colors of your public website.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={updateMutation.isPending}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-[#3c5e45] hover:bg-[#2d4a35] text-white"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {updateMutation.isSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Settings saved successfully!
        </div>
      )}
      {updateMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to save settings. Please try again.
        </div>
      )}

      <SectionCard title="Hero Section">
        <HeroSectionEditor
          title={form.hero.title}
          highlightedWord={form.hero.highlightedWord}
          subtitle={form.hero.subtitle}
          ctaText={form.hero.ctaText}
          ctaLink={form.hero.ctaLink}
          backgroundImage={form.hero.backgroundImage}
          stats={form.hero.stats}
          onChange={handleHeroChange}
        />
      </SectionCard>

      <SectionCard title="Highlights Section">
        <HighlightsEditor
          title={form.highlights.title}
          images={form.highlights.images}
          onChange={handleHighlightsChange}
        />
      </SectionCard>

      <SectionCard title="About Section">
        <AboutEditor
          title={form.about.title}
          description={form.about.description}
          stats={form.about.stats}
          onChange={handleAboutChange}
        />
      </SectionCard>

      <SectionCard title="Contact Section">
        <ContactEditor
          address={form.contact.address}
          phone={form.contact.phone}
          email={form.contact.email}
          hours={form.contact.hours}
          onChange={handleContactChange}
        />
      </SectionCard>

      <SectionCard title="Brand Colors">
        <ColorsEditor
          colors={form.colors}
          onChange={handleColorChange}
        />
      </SectionCard>
    </div>
  );
}
