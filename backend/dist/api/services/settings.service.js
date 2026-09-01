"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = void 0;
const settings_repository_1 = require("../repositories/settings.repository");
exports.settingsService = {
    async get() {
        return settings_repository_1.settingsRepository.findOrCreate();
    },
    async update(data) {
        return settings_repository_1.settingsRepository.update(data);
    }
};
