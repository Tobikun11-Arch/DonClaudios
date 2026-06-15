import {SiteSettingDocument, SiteSettingModel} from '../models/SiteSetting.model';

export const settingsRepository = {
  findOrCreate: async () => {
    const existing = await SiteSettingModel.findOne().exec();
    if (existing) return existing;
    return SiteSettingModel.create({});
  },

  update: (data: Partial<SiteSettingDocument>) =>
    SiteSettingModel.findOneAndUpdate({}, data, {new: true, upsert: true}).exec()
};
