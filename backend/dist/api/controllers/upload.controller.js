"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadController = void 0;
const error_1 = require("../utils/error");
const cloudinary_service_1 = require("../services/cloudinary.service");
exports.uploadController = {
    async uploadProductImage(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                throw new error_1.ApiError(400, 'NO_FILE', 'No file uploaded');
            }
            if (!file.mimetype.startsWith('image/')) {
                throw new error_1.ApiError(400, 'INVALID_FILE', 'File must be an image');
            }
            const { secureUrl } = await (0, cloudinary_service_1.uploadProductImageBuffer)({
                buffer: file.buffer,
                filename: file.originalname
            });
            return res.status(200).json({ imageUrl: secureUrl });
        }
        catch (error) {
            next(error);
        }
    },
    async uploadPromoImage(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                throw new error_1.ApiError(400, 'NO_FILE', 'No file uploaded');
            }
            if (!file.mimetype.startsWith('image/')) {
                throw new error_1.ApiError(400, 'INVALID_FILE', 'File must be an image');
            }
            const { secureUrl } = await (0, cloudinary_service_1.uploadPromoImageBuffer)({
                buffer: file.buffer,
                filename: file.originalname
            });
            return res.status(200).json({ imageUrl: secureUrl });
        }
        catch (error) {
            next(error);
        }
    }
};
