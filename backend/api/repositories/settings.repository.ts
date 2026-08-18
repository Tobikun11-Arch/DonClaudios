import {SiteSettingDocument, SiteSettingModel} from '../models/SiteSetting.model';

export const settingsRepository = {
  findOne: () => SiteSettingModel.findOne().exec(),

  findOrCreate: async () => {
    let doc = await SiteSettingModel.findOne().exec();
    if (!doc) {
      doc = await SiteSettingModel.create({});
    }
    return doc;
  },

  update: (data: Partial<SiteSettingDocument>) =>
    SiteSettingModel.findOneAndUpdate({}, data, {new: true, upsert: true}).exec()
};
