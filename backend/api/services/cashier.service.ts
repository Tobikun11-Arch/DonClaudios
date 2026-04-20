import bcrypt from 'bcrypt';
import {ApiError} from '../utils/error';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {customerRepository} from '../repositories/customer.repository';

export const cashierService = {
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
  }
};
