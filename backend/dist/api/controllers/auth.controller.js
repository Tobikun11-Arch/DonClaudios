"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../services/auth.service");
const env_1 = require("../config/env");
const error_1 = require("../utils/error");
const customer_repository_1 = require("../repositories/customer.repository");
const admin_repository_1 = require("../repositories/admin.repository");
const ACCESS_COOKIE = 'dc_access_token';
const REFRESH_COOKIE = 'dc_refresh_token';
function getCookieOptions() {
    const isProduction = env_1.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const sameSite = process.env.COOKIE_SAMESITE ?? (isProduction ? 'none' : 'lax');
    const secure = process.env.COOKIE_SECURE === 'true' ||
        (process.env.COOKIE_SECURE !== 'false' && sameSite === 'none');
    return {
        httpOnly: true,
        secure,
        sameSite: sameSite,
        path: '/'
    };
}
exports.authController = {
    async me(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            if (!req.auth.type) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Invalid token');
            }
            const customer = req.auth.type === 'customer'
                ? await customer_repository_1.customerRepository.findById(req.auth.userId)
                : null;
            const admin = req.auth.type === 'admin'
                ? await admin_repository_1.adminRepository.findById(req.auth.userId)
                : null;
            res.status(200).json({
                user: {
                    id: req.auth.userId,
                    type: req.auth.type,
                    firstName: admin?.firstName ?? customer?.firstName,
                    lastName: admin?.lastName ?? customer?.lastName,
                    email: admin?.email ?? customer?.email,
                    phoneNumber: admin?.phoneNumber ?? customer?.phoneNumber,
                    address: admin?.address ?? customer?.address,
                    username: admin?.username,
                    profilePhoto: admin?.profilePhoto ?? customer?.profilePhoto,
                    businessName: admin?.businessName,
                    businessLogo: admin?.businessLogo,
                    storeAddress: admin?.storeAddress,
                    businessContactNumber: admin?.businessContactNumber,
                    operatingHours: admin?.operatingHours,
                    businessType: admin?.businessType
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    async updateProfile(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const allowedCustomerFields = [
                'firstName',
                'lastName',
                'phoneNumber',
                'address',
                'profilePhoto'
            ];
            if (req.auth.type === 'admin') {
                const updated = await admin_repository_1.adminRepository.updateProfile(req.auth.userId, req.body);
                if (!updated) {
                    throw new error_1.ApiError(404, 'USER_NOT_FOUND', 'User not found');
                }
                return res.status(200).json({
                    user: {
                        id: updated.id,
                        type: 'admin',
                        firstName: updated.firstName,
                        lastName: updated.lastName,
                        email: updated.email,
                        phoneNumber: updated.phoneNumber,
                        address: updated.address,
                        username: updated.username,
                        profilePhoto: updated.profilePhoto,
                        businessName: updated.businessName,
                        businessLogo: updated.businessLogo,
                        storeAddress: updated.storeAddress,
                        businessContactNumber: updated.businessContactNumber,
                        operatingHours: updated.operatingHours,
                        businessType: updated.businessType
                    }
                });
            }
            if (req.auth.type === 'customer') {
                const patch = {};
                for (const key of allowedCustomerFields) {
                    if (key in req.body) {
                        patch[key] = req.body[key];
                    }
                }
                const updated = await customer_repository_1.customerRepository.updateProfile(req.auth.userId, patch);
                if (!updated) {
                    throw new error_1.ApiError(404, 'USER_NOT_FOUND', 'User not found');
                }
                const user = await customer_repository_1.customerRepository.findById(req.auth.userId);
                if (!user) {
                    throw new error_1.ApiError(404, 'USER_NOT_FOUND', 'User not found');
                }
                return res.status(200).json({
                    user: {
                        id: user.id,
                        type: 'customer',
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        address: user.address,
                        profilePhoto: user.profilePhoto
                    }
                });
            }
            throw new error_1.ApiError(403, 'FORBIDDEN', 'Permission denied');
        }
        catch (error) {
            next(error);
        }
    },
    async changePassword(req, res, next) {
        try {
            if (!req.auth || req.auth.type !== 'admin') {
                throw new error_1.ApiError(403, 'FORBIDDEN', 'Admin access required');
            }
            await auth_service_1.authService.changePassword(req.auth.userId, req.body.currentPassword, req.body.newPassword);
            res.status(200).json({ message: 'Password updated' });
        }
        catch (error) {
            next(error);
        }
    },
    async register(req, res, next) {
        try {
            const result = await auth_service_1.authService.register(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    async verify(req, res, next) {
        try {
            await auth_service_1.authService.verify(req.body.email, req.body.code);
            res.status(200).json({ message: 'Verified' });
        }
        catch (error) {
            next(error);
        }
    },
    async resendVerification(req, res, next) {
        try {
            await auth_service_1.authService.resendVerification(req.body.email);
            res.status(200).json({ message: 'Verification code resent' });
        }
        catch (error) {
            next(error);
        }
    },
    async login(req, res, next) {
        try {
            const { accessToken, refreshToken, user, userType } = await auth_service_1.authService.login(req.body.email, req.body.password);
            const opts = getCookieOptions();
            res.cookie(ACCESS_COOKIE, accessToken, {
                ...opts,
                maxAge: 15 * 60 * 1000
            });
            res.cookie(REFRESH_COOKIE, refreshToken, {
                ...opts,
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.status(200).json({
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    type: userType,
                    firstName: 'firstName' in user ? user.firstName : undefined,
                    lastName: 'lastName' in user ? user.lastName : undefined,
                    phoneNumber: 'phoneNumber' in user ? user.phoneNumber : undefined,
                    address: 'address' in user ? user.address : undefined
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE] ??
                req.body.refreshToken;
            if (!refreshToken) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Missing refresh token');
            }
            const result = await auth_service_1.authService.refreshAccessToken(refreshToken);
            const opts = getCookieOptions();
            res.cookie(ACCESS_COOKIE, result.accessToken, {
                ...opts,
                maxAge: 15 * 60 * 1000
            });
            res.status(200).json({ message: 'Refreshed' });
        }
        catch (error) {
            const opts = getCookieOptions();
            res.clearCookie(ACCESS_COOKIE, opts);
            res.clearCookie(REFRESH_COOKIE, opts);
            next(error);
        }
    },
    async logout(_req, res, next) {
        try {
            const opts = getCookieOptions();
            res.clearCookie(ACCESS_COOKIE, opts);
            res.clearCookie(REFRESH_COOKIE, opts);
            res.status(200).json({ message: 'Logged out' });
        }
        catch (error) {
            next(error);
        }
    },
    async sessions(req, res, next) {
        try {
            if (!req.auth || req.auth.type !== 'admin') {
                throw new error_1.ApiError(403, 'FORBIDDEN', 'Admin access required');
            }
            res.status(200).json({
                sessions: [
                    {
                        device: 'This device',
                        location: 'Current session',
                        lastActive: new Date().toISOString(),
                        isCurrent: true
                    }
                ]
            });
        }
        catch (error) {
            next(error);
        }
    }
};
