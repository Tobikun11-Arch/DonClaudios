"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', settings_controller_1.settingsController.getSettings);
router.put('/', auth_1.requireAuth, auth_1.requireAdmin, settings_controller_1.settingsController.updateSettings);
exports.default = router;
