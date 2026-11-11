import {settingsRepository} from '../repositories/settings.repository';
import type {SiteSettingDocument} from '../models/SiteSetting.model';
import {
  DEFAULT_FREE_DELIVERY_SETTINGS,
  isValidLatLng,
  type FreeDeliverySettings
} from '../config/delivery';

/** Saved free-delivery settings, with defaults filled in for unset parts. */
function resolveFreeDelivery(
  saved: SiteSettingDocument['freeDelivery'] | undefined
): FreeDeliverySettings {
  const zone = (saved?.zone ?? [])
    .map(p => ({lat: Number(p.lat), lng: Number(p.lng)}))
    .filter(isValidLatLng);
  return {
    enabled:
      typeof saved?.enabled === 'boolean'
        ? saved.enabled
        : DEFAULT_FREE_DELIVERY_SETTINGS.enabled,
    minSubtotal:
      typeof saved?.minSubtotal === 'number' && saved.minSubtotal >= 0
        ? saved.minSubtotal
        : DEFAULT_FREE_DELIVERY_SETTINGS.minSubtotal,
    zone: zone.length >= 3 ? zone : DEFAULT_FREE_DELIVERY_SETTINGS.zone
  };
}

export const settingsService = {
  async get() {
    return settingsRepository.findOrCreate();
  },

  async update(data: Partial<SiteSettingDocument>) {
    // Free delivery has its own validated endpoint; never let the generic
    // homepage save overwrite it.
    const {freeDelivery: _ignored, ...rest} = data as Partial<SiteSettingDocument> & {
      freeDelivery?: unknown;
    };
    return settingsRepository.update(rest);
  },

  async getFreeDelivery(): Promise<FreeDeliverySettings> {
    const doc = await settingsRepository.findOrCreate();
    return resolveFreeDelivery(doc.freeDelivery);
  },

  async updateFreeDelivery(input: FreeDeliverySettings): Promise<FreeDeliverySettings> {
    const doc = await settingsRepository.update({
      freeDelivery: {
        enabled: input.enabled,
        minSubtotal: input.minSubtotal,
        zone: input.zone.map(p => ({lat: p.lat, lng: p.lng}))
      }
    } as Partial<SiteSettingDocument>);
    return resolveFreeDelivery(doc?.freeDelivery);
  },

  defaultFreeDelivery(): FreeDeliverySettings {
    return DEFAULT_FREE_DELIVERY_SETTINGS;
  }
};
