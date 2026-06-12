import bcrypt from 'bcrypt';
import {ApiError} from '../utils/error';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {customerRepository} from '../repositories/customer.repository';

export const cashierService = {
  async listCashiers() {
    return cashierRepository.listAll();
  },

  async getCashier(id: string) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }
    return cashier;
  },

  async createCashier(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    username: string;
    phoneNumber?: string;
    address?: string;
  }) {
    const email = data.email.toLowerCase();

    const [existingCashierEmail, existingAdminEmail, existingCustomerEmail] =
      await Promise.all([
        cashierRepository.findByEmail(email),
        adminRepository.findByEmail(email),
        customerRepository.findByEmail(email)
      ]);

    if (existingCashierEmail || existingAdminEmail || existingCustomerEmail) {
      throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
    }

    const existingUsername = await cashierRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const cashier = await cashierRepository.create({
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

    return {id: cashier.id, email: cashier.email, username: cashier.username};
  },

  async updateCashier(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      username?: string;
      phoneNumber?: string;
      address?: string;
    }
  ) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.address !== undefined) updateData.address = data.address;

    if (data.email !== undefined) {
      const newEmail = data.email.toLowerCase();
      const existing = await cashierRepository.findByEmail(newEmail);
      if (existing && existing.id !== id) {
        throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
      }
      updateData.email = newEmail;
    }

    if (data.username !== undefined) {
      const existing = await cashierRepository.findByUsername(data.username);
      if (existing && existing.id !== id) {
        throw new ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
      }
      updateData.username = data.username.trim();
    }

    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await cashierRepository.updateById(id, updateData);
    if (!updated) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }
    return updated;
  },

  async deleteCashier(id: string) {
    const deleted = await cashierRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }
    return {message: 'Deleted'};
  }
};
