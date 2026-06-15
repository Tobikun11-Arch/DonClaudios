import {settingsRepository} from '../repositories/settings.repository';

export const settingsService = {
  async get() {
    return settingsRepository.findOrCreate();
  },

  async update(data: Record<string, unknown>) {
    return settingsRepository.update(data);
  }
};
