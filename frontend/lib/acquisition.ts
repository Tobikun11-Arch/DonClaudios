/**
 * Customer acquisition — where a customer came from.
 *
 * Mirrors `backend/api/config/acquisition.ts`. Keep the source keys in sync.
 *
 * On the FIRST visit we remember `?utm_source=…` from our own links (e.g. a
 * Facebook post linking to `https://…/?utm_source=facebook`) or, failing that,
 * the referring site. The optional "How did you hear about us?" answer is
 * stored next to it. Both are sent with sign-up and guest checkout and are
 * never required: storage can be blocked, and that must not break anything.
 */

export const ACQUISITION_SOURCES = [
  'facebook',
  'instagram',
  'tiktok',
  'google',
  'messenger',
  'friend',
  'walk_by',
  'direct',
  'other'
] as const;

export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export const HEARD_FROM_OPTIONS: {value: AcquisitionSource; label: string}[] = [
  {value: 'facebook', label: 'Facebook'},
  {value: 'tiktok', label: 'TikTok'},
  {value: 'instagram', label: 'Instagram'},
  {value: 'google', label: 'Google'},
  {value: 'friend', label: 'Friend or family'},
  {value: 'walk_by', label: 'Saw the store'},
  {value: 'other', label: 'Other'}
];

export type AcquisitionPayload = {
  source?: AcquisitionSource;
  heardFrom?: AcquisitionSource;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPath?: string;
  firstSeenAt?: string;
};

const STORAGE_KEY = 'dc_acquisition_v1';

/** Maps a utm_source value or a referrer host to a channel. */
function channelFrom(value: string): AcquisitionSource {
  const v = value.toLowerCase();
  if (/messenger|(^|\.)m\.me$/.test(v)) return 'messenger';
  if (/facebook|^fb$|fb\.com|fb\.me/.test(v)) return 'facebook';
  if (/instagram|^ig$/.test(v)) return 'instagram';
  if (/tiktok/.test(v)) return 'tiktok';
  if (/google|bing|yahoo|duckduckgo/.test(v)) return 'google';
  return 'other';
}

function read(): AcquisitionPayload | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AcquisitionPayload) : null;
  } catch {
    return null;
  }
}

function write(value: AcquisitionPayload) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: tracking is best-effort.
  }
}

/**
 * Records the first-touch source once per browser. A later visit only fills
 * in a source when the first one was a plain direct visit and this one came
 * from a tagged link, so an ad click is not lost behind a bookmark visit.
 */
export function captureAcquisition() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get('utm_source')?.trim().slice(0, 60) || undefined;
    const utmMedium = url.searchParams.get('utm_medium')?.trim().slice(0, 60) || undefined;
    const utmCampaign = url.searchParams.get('utm_campaign')?.trim().slice(0, 100) || undefined;

    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : '';
      if (host && host !== window.location.hostname) referrer = host.slice(0, 120);
    } catch {
      referrer = undefined;
    }

    const source: AcquisitionSource = utmSource
      ? channelFrom(utmSource)
      : referrer
        ? channelFrom(referrer)
        : 'direct';

    const existing = read();
    if (existing?.source && !(existing.source === 'direct' && source !== 'direct')) return;

    write({
      ...existing,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
      landingPath: url.pathname.slice(0, 200),
      firstSeenAt: existing?.firstSeenAt ?? new Date().toISOString()
    });
  } catch {
    // Never let tracking break the page.
  }
}

export function getHeardFrom(): AcquisitionSource | null {
  if (typeof window === 'undefined') return null;
  return read()?.heardFrom ?? null;
}

export function setHeardFrom(value: AcquisitionSource | null) {
  if (typeof window === 'undefined') return;
  const current = read() ?? {};
  if (value) current.heardFrom = value;
  else delete current.heardFrom;
  write(current);
}

/** What to send with sign-up / guest checkout, or undefined when nothing is known. */
export function getAcquisitionPayload(): AcquisitionPayload | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = read();
  return value && Object.keys(value).length > 0 ? value : undefined;
}
