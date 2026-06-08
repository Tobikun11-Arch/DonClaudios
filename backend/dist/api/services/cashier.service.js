"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashierService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const error_1 = require("../utils/error");
const cashier_repository_1 = require("../repositories/cashier.repository");
const admin_repository_1 = require("../repositories/admin.repository");
const customer_repository_1 = require("../repositories/customer.repository");
exports.cashierService = {
    async listCashiers() {
        return cashier_repository_1.cashierRepository.listAll();
    },
    async getCashier(id) {
        const cashier = await cashier_repository_1.cashierRepository.findById(id);
        if (!cashier) {
            throw new error_1.ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
        }
        return cashier;
    },
    async createCashier(data) {
        const email = data.email.toLowerCase();
        const [existingCashierEmail, existingAdminEmail, existingCustomerEmail] = await Promise.all([
            cashier_repository_1.cashierRepository.findByEmail(email),
            admin_repository_1.adminRepository.findByEmail(email),
            customer_repository_1.customerRepository.findByEmail(email)
        ]);
        if (existingCashierEmail || existingAdminEmail || existingCustomerEmail) {
            throw new error_1.ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
        }
        const existingUsername = await cashier_repository_1.cashierRepository.findByUsername(data.username);
        if (existingUsername) {
            throw new error_1.ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 10);
        const cashier = await cashier_repository_1.cashierRepository.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email,
            passwordHash,
            phoneNumber: data.phoneNumber,
            address: data.address,
            username: data.username.trim(),
            isOnline: false,
            isVerified: true,
            verificationCode: null,
            verificationExpiry: null
        });
        return { id: cashier.id, email: cashier.email, username: cashier.username };
    },
    async updateCashier(id, data) {
        const cashier = await cashier_repository_1.cashierRepository.findById(id);
        if (!cashier) {
            throw new error_1.ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
        }
        const updateData = {};
        if (data.firstName !== undefined)
            updateData.firstName = data.firstName;
        if (data.lastName !== undefined)
            updateData.lastName = data.lastName;
        if (data.phoneNumber !== undefined)
            updateData.phoneNumber = data.phoneNumber;
        if (data.address !== undefined)
            updateData.address = data.address;
        if (data.email !== undefined) {
            const newEmail = data.email.toLowerCase();
            const existing = await cashier_repository_1.cashierRepository.findByEmail(newEmail);
            if (existing && existing.id !== id) {
                throw new error_1.ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
            }
            updateData.email = newEmail;
        }
        if (data.username !== undefined) {
            const existing = await cashier_repository_1.cashierRepository.findByUsername(data.username);
            if (existing && existing.id !== id) {
                throw new error_1.ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
            }
            updateData.username = data.username.trim();
        }
        if (data.password !== undefined) {
            updateData.passwordHash = await bcrypt_1.default.hash(data.password, 10);
        }
        const updated = await cashier_repository_1.cashierRepository.updateById(id, updateData);
        if (!updated) {
            throw new error_1.ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
        }
        return updated;
    },
    async deleteCashier(id) {
        const deleted = await cashier_repository_1.cashierRepository.deleteById(id);
        if (!deleted) {
            throw new error_1.ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
        }
        return { message: 'Deleted' };
    }
};
