"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCloudinaryConfigured = ensureCloudinaryConfigured;
exports.uploadProductImageBuffer = uploadProductImageBuffer;
exports.uploadPromoImageBuffer = uploadPromoImageBuffer;
exports.uploadProfileImageBuffer = uploadProfileImageBuffer;
const cloudinary_1 = require("cloudinary");
let configured = false;
function ensureCloudinaryConfigured() {
    if (configured)
        return;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }
    cloudinary_1.v2.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
    configured = true;
}
async function uploadProductImageBuffer(params) {
    ensureCloudinaryConfigured();
    return new Promise(function executor(resolve, reject) {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder: 'products',
            resource_type: 'image'
        }, (error, result) => {
            if (error)
                return reject(error);
            if (!result?.secure_url) {
                return reject(new Error('Cloudinary upload returned no secure_url'));
            }
            resolve({ secureUrl: result.secure_url });
        });
        stream.end(params.buffer);
    });
}
async function uploadPromoImageBuffer(params) {
    ensureCloudinaryConfigured();
    return new Promise(function executor(resolve, reject) {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder: 'promos',
            resource_type: 'image'
        }, (error, result) => {
            if (error)
                return reject(error);
            if (!result?.secure_url) {
                return reject(new Error('Cloudinary upload returned no secure_url'));
            }
            resolve({ secureUrl: result.secure_url });
        });
        stream.end(params.buffer);
    });
}
async function uploadProfileImageBuffer(params) {
    ensureCloudinaryConfigured();
    return new Promise(function executor(resolve, reject) {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder: 'profile',
            resource_type: 'image'
        }, (error, result) => {
            if (error)
                return reject(error);
            if (!result?.secure_url) {
                return reject(new Error('Cloudinary upload returned no secure_url'));
            }
            resolve({ secureUrl: result.secure_url });
        });
        stream.end(params.buffer);
    });
}
