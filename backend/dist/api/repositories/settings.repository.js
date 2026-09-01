"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRepository = void 0;
const SiteSetting_model_1 = require("../models/SiteSetting.model");
exports.settingsRepository = {
    findOne: () => SiteSetting_model_1.SiteSettingModel.findOne().exec(),
    findOrCreate: async () => {
        let doc = await SiteSetting_model_1.SiteSettingModel.findOne().exec();
        if (!doc) {
            doc = await SiteSetting_model_1.SiteSettingModel.create({});
        }
        return doc;
    },
    update: (data) => SiteSetting_model_1.SiteSettingModel.findOneAndUpdate({}, data, { new: true, upsert: true }).exec()
};
