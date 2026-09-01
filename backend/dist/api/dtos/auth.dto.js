"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordDto = exports.updateProfileDto = exports.resetPasswordDto = exports.forgotPasswordDto = exports.refreshDto = exports.loginDto = exports.resendVerificationDto = exports.verifyDto = exports.registerDto = void 0;
const zod_1 = require("zod");
exports.registerDto = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    phoneNumber: zod_1.z.string().min(1).optional(),
    address: zod_1.z.string().min(1).optional()
});
exports.verifyDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().length(6) // always 6 digits from generateVerificationCode()
});
exports.resendVerificationDto = zod_1.z.object({
    email: zod_1.z.string().email()
});
exports.loginDto = zod_1.z.object({
    email: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8)
});
exports.refreshDto = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).optional()
});
exports.forgotPasswordDto = zod_1.z.object({
    email: zod_1.z.string().email()
});
exports.resetPasswordDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().length(6),
    newPassword: zod_1.z.string().min(8)
});
exports.updateProfileDto = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    phoneNumber: zod_1.z.string().min(1).optional(),
    username: zod_1.z.string().min(1).optional(),
    profilePhoto: zod_1.z.string().min(1).optional(),
    businessName: zod_1.z.string().min(1).optional(),
    businessLogo: zod_1.z.string().min(1).optional(),
    storeAddress: zod_1.z.string().min(1).optional(),
    businessContactNumber: zod_1.z.string().min(1).optional(),
    operatingHours: zod_1.z.string().min(1).optional(),
    businessType: zod_1.z.string().min(1).optional(),
    address: zod_1.z.string().min(1).optional()
});
exports.changePasswordDto = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8)
});
