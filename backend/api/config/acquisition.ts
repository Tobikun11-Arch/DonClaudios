/**
 * Customer acquisition — where a customer came from.
 *
 * Mirrored by `frontend/lib/acquisition.ts`. Keep the source keys in sync.
 *
 * Two signals are kept side by side:
 *   - automatic: captured by the browser on the customer's FIRST visit
 *     (`?utm_source=` on our links, else the referring site), and
 *   - asked: the optional "How did you hear about us?" answer.
 * Reports prefer the customer's own answer, then the automatic channel.
 *
 * Everything here is OPTIONAL. Bad or missing input is dropped silently and
 * never fails a sign-up or checkout; accounts made before this existed simply
 * have no `acquisition` and report as "Unknown".
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

/** Options customers can pick in "How did you hear about us?". */
export const HEARD_FROM_OPTIONS = [
  'facebook',
  'instagram',
  'tiktok',
  'google',
  'friend',
  'walk_by',
  'other'
] as const satisfies readonly AcquisitionSource[];

export const ACQUISITION_LABELS: Record<AcquisitionSource | 'unknown', string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google: 'Google',
  messenger: 'Messenger',
  friend: 'Friend or family',
  walk_by: 'Saw the store',
  direct: 'Direct visit',
  other: 'Other',
  unknown: 'Unknown'
};

export type Acquisition = {
  /** Channel detected automatically on the first visit. */
  source?: AcquisitionSource;
  /** The customer's own answer to "How did you hear about us?". */
  heardFrom?: AcquisitionSource;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Referring site's host only (never the full URL). */
  referrer?: string;
  /** Path of the first page they landed on, without the query string. */
  landingPath?: string;
  firstSeenAt?: Date;
};

const isSource = (v: unknown): v is AcquisitionSource =>
  typeof v === 'string' && (ACQUISITION_SOURCES as readonly string[]).includes(v);

const cleanText = (v: unknown, max: number) => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().replace(/[\u0000-\u001f<>]/g, '').slice(0, max);
  return t || undefined;
};

/**
 * Turns whatever the client sent into a safe `Acquisition`, or undefined.
 * Never throws: an unexpected shape just means "no data".
 */
export function sanitizeAcquisition(raw: unknown): Acquisition | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;

  const out: Acquisition = {};
  if (isSource(r.source)) out.source = r.source;
  if (isSource(r.heardFrom)) out.heardFrom = r.heardFrom;
  out.utmSource = cleanText(r.utmSource, 60)?.toLowerCase();
  out.utmMedium = cleanText(r.utmMedium, 60)?.toLowerCase();
  out.utmCampaign = cleanText(r.utmCampaign, 100);
  out.referrer = cleanText(r.referrer, 120)?.toLowerCase();
  out.landingPath = cleanText(r.landingPath, 200);

  if (typeof r.firstSeenAt === 'string' || typeof r.firstSeenAt === 'number') {
    const d = new Date(r.firstSeenAt);
    // Ignore clock-skewed or nonsense dates.
    if (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86400000) {
      out.firstSeenAt = d;
    }
  }

  for (const key of Object.keys(out) as (keyof Acquisition)[]) {
    if (out[key] === undefined) delete out[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
