"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = void 0;
const settings_service_1 = require("../services/settings.service");
exports.settingsController = {
    async getSettings(_req, res, next) {
        try {
            const settings = await settings_service_1.settingsService.get();
            res.status(200).json({ settings });
        }
        catch (error) {
            next(error);
        }
    },
    async updateSettings(req, res, next) {
        try {
            const settings = await settings_service_1.settingsService.update(req.body);
            res.status(200).json({ settings });
        }
        catch (error) {
            next(error);
        }
    }
};
