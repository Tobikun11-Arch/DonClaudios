"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const upload_controller_1 = require("../controllers/upload.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
router.post('/product-image', auth_1.requireAuth, auth_1.requireAdmin, upload.single('file'), upload_controller_1.uploadController.uploadProductImage);
router.post('/promo-image', auth_1.requireAuth, auth_1.requireAdmin, upload.single('file'), upload_controller_1.uploadController.uploadPromoImage);
exports.default = router;
