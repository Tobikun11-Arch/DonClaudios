import {settingsRepository} from '../repositories/settings.repository';
import type {SiteSettingDocument} from '../models/SiteSetting.model';

export const settingsService = {
  async get() {
    return settingsRepository.findOrCreate();
  },

  async update(data: Partial<SiteSettingDocument>) {
    return settingsRepository.update(data);
  }
};
