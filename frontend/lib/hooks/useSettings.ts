'use client';

import {getSettings, updateSettings} from '@/lib/api/settingsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {SiteSetting, SectionId, SectionStyle} from '@/lib/types/settings';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';

export const settingsQueryKey = ['settings'] as const;

function mergeWithDefaults(raw: Partial<SiteSetting>): SiteSetting {
  const d = DEFAULT_SETTINGS;
  return {
    hero: {
      title: raw.hero?.title || d.hero.title,
      highlightedWord: raw.hero?.highlightedWord || d.hero.highlightedWord,
      subtitle: raw.hero?.subtitle || d.hero.subtitle,
      ctaText: raw.hero?.ctaText || d.hero.ctaText,
      ctaLink: raw.hero?.ctaLink || d.hero.ctaLink,
      backgroundImage: raw.hero?.backgroundImage || d.hero.backgroundImage,
      stats: raw.hero?.stats?.length ? raw.hero.stats : d.hero.stats
    },
    highlights: {
      title: raw.highlights?.title || d.highlights.title,
      subtitle: raw.highlights?.subtitle || d.highlights.subtitle,
      images: raw.highlights?.images?.length ? raw.highlights.images : d.highlights.images
    },
    promo: {
      title: raw.promo?.title || d.promo.title,
      subtitle: raw.promo?.subtitle || d.promo.subtitle
    },
    about: {
      title: raw.about?.title || d.about.title,
      description: raw.about?.description || d.about.description,
      stats: raw.about?.stats?.length ? raw.about.stats : d.about.stats
    },
    reviews: {
      heading: raw.reviews?.heading || d.reviews.heading,
      subheading: raw.reviews?.subheading || d.reviews.subheading,
      featured: raw.reviews?.featured?.quote ? raw.reviews.featured : d.reviews.featured,
      items: raw.reviews?.items?.length ? raw.reviews.items : d.reviews.items
    },
    contact: {
      address: raw.contact?.address || d.contact.address,
      phones: raw.contact?.phones?.length ? raw.contact.phones : d.contact.phones,
      email: raw.contact?.email || d.contact.email,
      hours: raw.contact?.hours || d.contact.hours
    },
    footer: {
      brandName: raw.footer?.brandName || d.footer.brandName,
      description: raw.footer?.description || d.footer.description,
      phones: raw.footer?.phones?.length ? raw.footer.phones : d.footer.phones,
      email: raw.footer?.email || d.footer.email,
      address: raw.footer?.address || d.footer.address,
      hours: raw.footer?.hours || d.footer.hours
    },
    colors: {
      primary: raw.colors?.primary || d.colors.primary,
      accent: raw.colors?.accent || d.colors.accent,
      muted: raw.colors?.muted || d.colors.muted,
      darkGreen: raw.colors?.darkGreen || d.colors.darkGreen,
      mediumGreen: raw.colors?.mediumGreen || d.colors.mediumGreen,
      lightGreen: raw.colors?.lightGreen || d.colors.lightGreen,
      beige: raw.colors?.beige || d.colors.beige,
      red: raw.colors?.red || d.colors.red,
      backgroundColor: raw.colors?.backgroundColor || d.colors.backgroundColor
    },
    sectionStyles: (['hero', 'highlights', 'promo', 'about', 'reviews', 'contact'] as SectionId[]).reduce(
      (acc, id) => {
        const rawStyle = raw.sectionStyles?.[id] as SectionStyle | undefined;
        const defaultStyle = d.sectionStyles[id];
        acc[id] = {
          backgroundColor: rawStyle?.backgroundColor || defaultStyle.backgroundColor,
          textColor: rawStyle?.textColor || defaultStyle.textColor,
          fontFamily: rawStyle?.fontFamily || defaultStyle.fontFamily
        };
        return acc;
      },
      {} as Record<SectionId, SectionStyle>
    )
  };
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: async (): Promise<SiteSetting> => {
      try {
        const res = await getSettings();
        return mergeWithDefaults(res.settings);
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    placeholderData: DEFAULT_SETTINGS
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SiteSetting>) => updateSettings(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: settingsQueryKey});
    }
  });
}
