import bcrypt from 'bcrypt';
import {ApiError} from '../utils/error';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {customerRepository} from '../repositories/customer.repository';

type CreateCashierData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  phoneNumber?: string;
  address?: string;
};

type UpdateCashierData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  username?: string;
  phoneNumber?: string;
  address?: string;
  isOnline?: boolean;
  isVerified?: boolean;
};

type CashierUpdate = Omit<UpdateCashierData, 'password'> & {
  passwordHash?: string;
};

export const cashierService = {
  async list() {
    return cashierRepository.list();
  },

  async getById(id: string) {
    const cashier = await cashierRepository.findSafeById(id);
    if (!cashier) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }
    return cashier;
  },

  async createCashier(data: CreateCashierData) {
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

    const existingUsername = await cashierRepository.findByUsername(
      data.username
    );
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

  async update(id: string, data: UpdateCashierData) {
    const existing = await cashierRepository.findById(id);
    if (!existing) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }

    const updateData: CashierUpdate = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      username: data.username,
      phoneNumber: data.phoneNumber,
      address: data.address,
      isOnline: data.isOnline,
      isVerified: data.isVerified
    };

    if (data.email) {
      const email = data.email.toLowerCase();
      const [existingCashierEmail, existingAdminEmail, existingCustomerEmail] =
        await Promise.all([
          cashierRepository.findByEmail(email),
          adminRepository.findByEmail(email),
          customerRepository.findByEmail(email)
        ]);

      if (
        (existingCashierEmail && existingCashierEmail.id !== id) ||
        existingAdminEmail ||
        existingCustomerEmail
      ) {
        throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
      }

      updateData.email = email;
    }

    if (data.username) {
      const existingUsername = await cashierRepository.findByUsername(
        data.username
      );
      if (existingUsername && existingUsername.id !== id) {
        throw new ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
      }
      updateData.username = data.username.trim();
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await cashierRepository.updateById(id, updateData);
    if (!updated) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }
    return updated;
  },

  async remove(id: string) {
    const deleted = await cashierRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'CASHIER_NOT_FOUND', 'Cashier not found');
    }
    return {message: 'Deleted'};
  }
};
