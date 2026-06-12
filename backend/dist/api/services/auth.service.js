"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const customer_repository_1 = require("../repositories/customer.repository");
const cashier_repository_1 = require("../repositories/cashier.repository");
const admin_repository_1 = require("../repositories/admin.repository");
const error_1 = require("../utils/error");
const email_service_1 = require("./email.service");
const verificationCodeEmail_1 = require("../templates/verificationCodeEmail");
const resetPasswordEmail_1 = require("../templates/resetPasswordEmail");
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function getVerificationExpiry(minutes) {
    return new Date(Date.now() + minutes * 60 * 1000);
}
exports.authService = {
    async register(data) {
        const [existingEmail, existingPhone] = await Promise.all([
            customer_repository_1.customerRepository.findByEmail(data.email),
            customer_repository_1.customerRepository.findByPhoneNumber(data.phoneNumber)
        ]);
        if (existingEmail) {
            throw new error_1.ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
        }
        if (existingPhone) {
            throw new error_1.ApiError(409, 'PHONE_EXISTS', 'Phone number already exists');
        }
        try {
            const passwordHash = await bcrypt_1.default.hash(data.password, 10);
            const verificationCode = generateVerificationCode();
            const verificationExpiry = getVerificationExpiry(10);
            const customer = await customer_repository_1.customerRepository.create({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                passwordHash,
                phoneNumber: data.phoneNumber,
                address: data.address,
                verificationCode,
                verificationExpiry,
                isVerified: false
            });
            const emailTpl = (0, verificationCodeEmail_1.verificationCodeEmailTemplate)({
                code: verificationCode,
                expiresMinutes: 10,
                recipientName: data.firstName
            });
            await email_service_1.emailService.sendEmail({
                to: data.email,
                subject: emailTpl.subject,
                text: emailTpl.text,
                html: emailTpl.html
            });
            return { id: customer.id, email: customer.email };
        }
        catch (err) {
            const code = err?.code;
            const rawMessage = String(err?.message ?? '');
            const keyPattern = err?.keyPattern;
            if (code === 11000 ||
                rawMessage.toLowerCase().includes('e11000') ||
                rawMessage.toLowerCase().includes('duplicate key')) {
                const isPhone = !!(keyPattern &&
                    typeof keyPattern === 'object' &&
                    'phoneNumber' in keyPattern);
                const isEmail = !!(keyPattern &&
                    typeof keyPattern === 'object' &&
                    'email' in keyPattern);
                if (isPhone || rawMessage.toLowerCase().includes('phonenumber')) {
                    throw new error_1.ApiError(409, 'PHONE_EXISTS', 'Phone number already exists');
                }
                if (isEmail || rawMessage.toLowerCase().includes('email')) {
                    throw new error_1.ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
                }
                throw new error_1.ApiError(409, 'ACCOUNT_EXISTS', 'Account already exists');
            }
            throw err;
        }
    },
    async verify(email, code) {
        const customer = await customer_repository_1.customerRepository.findByEmail(email);
        if (!customer ||
            !customer.verificationCode ||
            !customer.verificationExpiry) {
            throw new error_1.ApiError(400, 'INVALID_CODE', 'Invalid verification code');
        }
        const codeMatches = customer.verificationCode === code;
        const notExpired = customer.verificationExpiry > new Date();
        if (!codeMatches || !notExpired) {
            throw new error_1.ApiError(400, 'EXPIRED_CODE', 'Verification code expired or invalid');
        }
        await customer_repository_1.customerRepository.markVerified(email);
    },
    async resendVerification(email) {
        const customer = await customer_repository_1.customerRepository.findByEmail(email);
        if (!customer) {
            throw new error_1.ApiError(404, 'USER_NOT_FOUND', 'User not found');
        }
        if (customer.isVerified) {
            throw new error_1.ApiError(400, 'ALREADY_VERIFIED', 'Email already verified');
        }
        const verificationCode = generateVerificationCode();
        const verificationExpiry = getVerificationExpiry(10);
        await customer_repository_1.customerRepository.setVerificationCode(email, verificationCode, verificationExpiry);
        const emailTpl = (0, verificationCodeEmail_1.verificationCodeEmailTemplate)({
            code: verificationCode,
            expiresMinutes: 10,
            recipientName: customer.firstName
        });
        await email_service_1.emailService.sendEmail({
            to: email,
            subject: emailTpl.subject,
            text: emailTpl.text,
            html: emailTpl.html
        });
    },
    async sendResetPasswordCodeEmail(params) {
        const emailTpl = (0, resetPasswordEmail_1.resetPasswordEmailTemplate)({
            code: params.code,
            expiresMinutes: 10,
            recipientName: params.recipientName
        });
        await email_service_1.emailService.sendEmail({
            to: params.email,
            subject: emailTpl.subject,
            text: emailTpl.text,
            html: emailTpl.html
        });
    },
    async forgotPassword(email) {
        const customer = await customer_repository_1.customerRepository.findByEmail(email);
        if (!customer || !customer.isVerified)
            return;
        const resetCode = generateVerificationCode();
        const resetExpiry = getVerificationExpiry(10);
        await customer_repository_1.customerRepository.setVerificationCode(email, resetCode, resetExpiry);
        await exports.authService.sendResetPasswordCodeEmail({
            email,
            code: resetCode,
            recipientName: customer.firstName
        });
    },
    async resetPassword(email, code, newPassword) {
        const customer = await customer_repository_1.customerRepository.findByEmail(email);
        if (!customer ||
            !customer.verificationCode ||
            !customer.verificationExpiry) {
            throw new error_1.ApiError(400, 'INVALID_CODE', 'Invalid or expired reset code');
        }
        const codeMatches = customer.verificationCode === code;
        const notExpired = customer.verificationExpiry > new Date();
        if (!codeMatches || !notExpired) {
            throw new error_1.ApiError(400, 'EXPIRED_CODE', 'Reset code expired or invalid');
        }
        const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        // Clear the code then update the password
        await customer_repository_1.customerRepository.clearVerificationCode(email);
        await customer_repository_1.customerRepository.updateProfile(customer.id, { passwordHash });
    },
    async login(email, password) {
        const identifier = email;
        const [customer, cashier, admin] = await Promise.all([
            customer_repository_1.customerRepository.findByEmailOrPhoneNumber(identifier),
            cashier_repository_1.cashierRepository.findByEmailOrPhoneNumber(identifier),
            admin_repository_1.adminRepository.findByEmailOrPhoneNumber(identifier)
        ]);
        const user = customer || cashier || admin;
        const userType = customer
            ? 'customer'
            : cashier
                ? 'cashier'
                : admin
                    ? 'admin'
                    : null;
        if (!user || !userType) {
            throw new error_1.ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        if (!user.isVerified) {
            throw new error_1.ApiError(403, 'NOT_VERIFIED', 'Email not verified');
        }
        const match = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!match) {
            throw new error_1.ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, type: userType }, env_1.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: userType }, env_1.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        return { accessToken, refreshToken, user, userType };
    },
    async refreshAccessToken(refreshToken) {
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
            const tokenType = payload.type;
            let userType = null;
            let user = null;
            if (tokenType) {
                userType = tokenType;
                user = await (tokenType === 'customer'
                    ? customer_repository_1.customerRepository.findById(payload.userId)
                    : tokenType === 'cashier'
                        ? cashier_repository_1.cashierRepository.findById(payload.userId)
                        : admin_repository_1.adminRepository.findById(payload.userId));
            }
            else {
                const [customer, cashier, admin] = await Promise.all([
                    customer_repository_1.customerRepository.findById(payload.userId),
                    cashier_repository_1.cashierRepository.findById(payload.userId),
                    admin_repository_1.adminRepository.findById(payload.userId)
                ]);
                user = customer || cashier || admin;
                userType = customer
                    ? 'customer'
                    : cashier
                        ? 'cashier'
                        : admin
                            ? 'admin'
                            : null;
            }
            if (!user || !userType) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Invalid token');
            }
            if (!user.isVerified) {
                throw new error_1.ApiError(403, 'NOT_VERIFIED', 'Email not verified');
            }
            const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, type: userType }, env_1.env.JWT_SECRET, { expiresIn: '15m' });
            return { accessToken };
        }
        catch {
            throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Invalid token');
        }
    }
};
