import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {customerRepository} from '../repositories/customer.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {ApiError} from '../utils/error';
import {emailService} from './email.service';
import {smsService} from './sms.service';
import {toInternationalPhone} from '../utils/phone';
import {resetPasswordEmailTemplate} from '../templates/resetPasswordEmail';
import {verificationCodeEmailTemplate} from '../templates/verificationCodeEmail';
import {accountNoticeEmailTemplate} from '../templates/accountNoticeEmail';
import {
  generateVerificationCode,
  getVerificationExpiry
} from '../utils/verification';

export const authService = {
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
    address: string;
    carrier?: 'globe_dito' | 'smart_tnt';
  }) {
    const email = data.email.toLowerCase().trim();
    const carrier = data.carrier === 'smart_tnt' ? 'smart_tnt' : 'globe_dito';
    const useEmailOtp = carrier === 'smart_tnt';

    // Validate phone format up front so we never persist a record we cannot
    // send an OTP to (which would leave the user stuck).
    if (data.phoneNumber) {
      const intl = toInternationalPhone(data.phoneNumber);
      if (!intl) {
        throw new ApiError(
          400,
          'INVALID_PHONE',
          'Invalid Philippine mobile number format'
        );
      }
    }

    const existingByEmail = await customerRepository.findByEmail(email);
    const existingByPhone = data.phoneNumber
      ? await customerRepository.findByPhoneNumber(data.phoneNumber)
      : null;

    // Block re-registration when a *verified* account already owns the email or
    // phone number. Unverified (pending) accounts are reusable below instead of
    // throwing "already exists", which is what previously trapped users.
    if (existingByEmail && existingByEmail.isVerified) {
      throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
    }

    if (
      existingByPhone &&
      existingByPhone.isVerified &&
      String(existingByPhone._id) !== String(existingByEmail?._id)
    ) {
      throw new ApiError(409, 'PHONE_EXISTS', 'Phone number already exists');
    }

    // Staff (cashier/admin) phone numbers are never claimable by customers.
    if (data.phoneNumber) {
      const [cashierPhone, adminPhone] = await Promise.all([
        cashierRepository.findByPhoneNumber(data.phoneNumber),
        adminRepository.findByPhoneNumber(data.phoneNumber)
      ]);

      if (cashierPhone || adminPhone) {
        throw new ApiError(409, 'PHONE_EXISTS', 'Phone number already exists');
      }
    }

    // If two distinct unverified records exist (one for the email, one for the
    // phone), consolidate by dropping the email-only one so the update below
    // does not trip the unique email index.
    if (
      existingByEmail &&
      existingByPhone &&
      String(existingByEmail._id) !== String(existingByPhone._id) &&
      !existingByEmail.isVerified &&
      !existingByPhone.isVerified
    ) {
      await customerRepository
        .deleteById(String(existingByEmail._id))
        .catch(() => {});
    }

    const target = existingByPhone || existingByEmail;

    const passwordHash = await bcrypt.hash(data.password, 10);
    const verificationCode = generateVerificationCode();
    const verificationExpiry = getVerificationExpiry(10);

    try {
      if (target) {
        // Reuse the pending (unverified) account: refresh its details and issue
        // a fresh OTP. This is the standard "resend on re-signup" behaviour.
        await customerRepository.update(String(target._id), {
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          passwordHash,
          phoneNumber: data.phoneNumber,
          address: data.address,
          verificationCode,
          verificationExpiry,
          isVerified: false,
          phoneVerified: false
        } as any);

        const customer = await customerRepository.findById(String(target._id));

        try {
          if (useEmailOtp) {
            const tpl = verificationCodeEmailTemplate({
              code: verificationCode,
              expiresMinutes: 10,
              recipientName: data.firstName
            });
            await emailService.sendEmail({
              to: email,
              subject: tpl.subject,
              text: tpl.text,
              html: tpl.html
            });
          } else {
            await smsService.sendVerificationSms({
              phoneNumber: customer?.phoneNumber ?? data.phoneNumber,
              code: verificationCode,
              expiresMinutes: 10
            });
          }
        } catch (sendError) {
          // Keep the pending record so the user can request a resend from the
          // verify screen; do not delete (unlike the brand-new case below).
          throw sendError;
        }

        return {
          id: String(target._id),
          phoneNumber: customer?.phoneNumber ?? data.phoneNumber
        };
      }

      const customer = await customerRepository.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        passwordHash,
        phoneNumber: data.phoneNumber,
        address: data.address,
        verificationCode,
        verificationExpiry,
        isVerified: false,
        phoneVerified: false
      });

      try {
        if (useEmailOtp) {
          const tpl = verificationCodeEmailTemplate({
            code: verificationCode,
            expiresMinutes: 10,
            recipientName: data.firstName
          });
          await emailService.sendEmail({
            to: email,
            subject: tpl.subject,
            text: tpl.text,
            html: tpl.html
          });
        } else {
          await smsService.sendVerificationSms({
            phoneNumber: customer.phoneNumber ?? data.phoneNumber,
            code: verificationCode,
            expiresMinutes: 10
          });
        }
      } catch (sendError) {
        await customerRepository.deleteById(customer.id).catch(() => {});
        throw sendError;
      }

      return {id: customer.id, phoneNumber: customer.phoneNumber};
    } catch (err: any) {
      const code = err?.code;
      const rawMessage = String(err?.message ?? '');
      const keyPattern = err?.keyPattern;

      if (
        code === 11000 ||
        rawMessage.toLowerCase().includes('e11000') ||
        rawMessage.toLowerCase().includes('duplicate key')
      ) {
        const isPhone = !!(
          keyPattern &&
          typeof keyPattern === 'object' &&
          'phoneNumber' in keyPattern
        );
        const isEmail = !!(
          keyPattern &&
          typeof keyPattern === 'object' &&
          'email' in keyPattern
        );

        if (isPhone || rawMessage.toLowerCase().includes('phonenumber')) {
          throw new ApiError(
            409,
            'PHONE_EXISTS',
            'Phone number already exists'
          );
        }

        if (isEmail || rawMessage.toLowerCase().includes('email')) {
          throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
        }

        throw new ApiError(409, 'ACCOUNT_EXISTS', 'Account already exists');
      }

      throw err;
    }
  },

  async verify(phoneNumber: string, code: string) {
    const customer = await customerRepository.findByPhoneNumber(phoneNumber);

    if (
      !customer ||
      !customer.verificationCode ||
      !customer.verificationExpiry
    ) {
      throw new ApiError(400, 'INVALID_CODE', 'Invalid verification code');
    }

    const codeMatches = customer.verificationCode === code;
    const notExpired = customer.verificationExpiry > new Date();

    if (!codeMatches || !notExpired) {
      throw new ApiError(
        400,
        'EXPIRED_CODE',
        'Verification code expired or invalid'
      );
    }

    await customerRepository.markVerified(phoneNumber);
  },

  async verifyEmail(email: string, code: string) {
    const customer = await customerRepository.findByEmail(email);
    if (
      !customer ||
      !customer.verificationCode ||
      !customer.verificationExpiry
    ) {
      throw new ApiError(400, 'INVALID_CODE', 'Invalid verification code');
    }

    const codeMatches = customer.verificationCode === code;
    const notExpired = customer.verificationExpiry > new Date();

    if (!codeMatches || !notExpired) {
      throw new ApiError(
        400,
        'EXPIRED_CODE',
        'Verification code expired or invalid'
      );
    }

    await customerRepository.update(String(customer._id), {
      isVerified: true,
      phoneVerified: false,
      verificationCode: null,
      verificationExpiry: null
    } as any);
  },

  async resendVerificationEmail(email: string) {
    const customer = await customerRepository.findByEmail(email);
    if (!customer) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (customer.isVerified) {
      throw new ApiError(400, 'ALREADY_VERIFIED', 'Account already verified');
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = getVerificationExpiry(10);

    await customerRepository.setVerificationCode(email, verificationCode, verificationExpiry);

    const tpl = verificationCodeEmailTemplate({
      code: verificationCode,
      expiresMinutes: 10,
      recipientName: customer.firstName
    });
    await emailService.sendEmail({
      to: email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html
    });
  },

  async resendVerification(phoneNumber: string) {
    const customer = await customerRepository.findByPhoneNumber(phoneNumber);
    if (!customer) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (customer.isVerified) {
      throw new ApiError(400, 'ALREADY_VERIFIED', 'Account already verified');
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = getVerificationExpiry(10);

    await customerRepository.setVerificationCode(
      phoneNumber,
      verificationCode,
      verificationExpiry
    );

    await smsService.sendVerificationSms({
      phoneNumber: customer.phoneNumber ?? phoneNumber,
      code: verificationCode,
      expiresMinutes: 10
    });
  },

  async sendResetPasswordCodeEmail(params: {
    email: string;
    code: string;
    recipientName?: string;
  }) {
    const emailTpl = resetPasswordEmailTemplate({
      code: params.code,
      expiresMinutes: 10,
      recipientName: params.recipientName
    });

    await emailService.sendEmail({
      to: params.email,
      subject: emailTpl.subject,
      text: emailTpl.text,
      html: emailTpl.html
    });
  },

  async forgotPassword(email: string) {
    const [customer, cashier, admin] = await Promise.all([
      customerRepository.findByEmail(email),
      cashierRepository.findByEmail(email),
      adminRepository.findByEmail(email)
    ]);

    const user =
      (customer && customer.isVerified && customer) ||
      (cashier && cashier.isVerified && cashier) ||
      (admin && admin.isVerified && admin);

    if (!user) return;

    const resetCode = generateVerificationCode();
    const resetExpiry = getVerificationExpiry(10);

    // Persist the code on the matching user document.
    if (user === customer) {
      await customerRepository.setVerificationCode(email, resetCode, resetExpiry);
    } else if (user === cashier) {
      await cashierRepository.updateProfile(user.id, {
        verificationCode: resetCode,
        verificationExpiry: resetExpiry
      } as any);
    } else {
      await adminRepository.updateProfile(user.id, {
        verificationCode: resetCode,
        verificationExpiry: resetExpiry
      } as any);
    }

    await authService.sendResetPasswordCodeEmail({
      email,
      code: resetCode,
      recipientName: user.firstName
    });
  },

  async verifyResetCode(email: string, code: string) {
    const [customer, cashier, admin] = await Promise.all([
      customerRepository.findByEmail(email),
      cashierRepository.findByEmail(email),
      adminRepository.findByEmail(email)
    ]);

    const user = customer || cashier || admin;

    if (
      !user ||
      !user.verificationCode ||
      !user.verificationExpiry
    ) {
      throw new ApiError(400, 'INVALID_CODE', 'Invalid or expired reset code');
    }

    const codeMatches = user.verificationCode === code;
    const notExpired = user.verificationExpiry > new Date();

    if (!codeMatches || !notExpired) {
      throw new ApiError(400, 'EXPIRED_CODE', 'Reset code expired or invalid');
    }

    return true;
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const [customer, cashier, admin] = await Promise.all([
      customerRepository.findByEmail(email),
      cashierRepository.findByEmail(email),
      adminRepository.findByEmail(email)
    ]);

    const user = customer || cashier || admin;

    if (
      !user ||
      !user.verificationCode ||
      !user.verificationExpiry
    ) {
      throw new ApiError(400, 'INVALID_CODE', 'Invalid or expired reset code');
    }

    const codeMatches = user.verificationCode === code;
    const notExpired = user.verificationExpiry > new Date();

    if (!codeMatches || !notExpired) {
      throw new ApiError(400, 'EXPIRED_CODE', 'Reset code expired or invalid');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Clear the code then update the password on the matching repository.
    if (user === customer) {
      await customerRepository.clearVerificationCode(email);
      await customerRepository.updateProfile(user.id, {
        passwordHash,
        passwordChangedAt: new Date()
      } as any);
    } else if (user === cashier) {
      await cashierRepository.updateProfile(user.id, {
        verificationCode: null,
        verificationExpiry: null,
        passwordHash,
        passwordChangedAt: new Date()
      } as any);
    } else {
      await adminRepository.updateProfile(user.id, {
        verificationCode: null,
        verificationExpiry: null,
        passwordHash,
        passwordChangedAt: new Date()
      } as any);
    }
  },

  async login(email: string, password: string) {
    const identifier = email;
    const [customer, cashier, admin] = await Promise.all([
      customerRepository.findByEmailOrPhoneNumber(identifier),
      cashierRepository.findByEmailOrPhoneNumber(identifier),
      adminRepository.findByEmailOrPhoneNumber(identifier)
    ]);

    const candidates: {user: any; type: 'customer' | 'cashier' | 'admin'}[] = [];
    if (customer) candidates.push({user: customer, type: 'customer'});
    if (cashier) candidates.push({user: cashier, type: 'cashier'});
    if (admin) candidates.push({user: admin, type: 'admin'});

    if (candidates.length === 0) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
    }

    const verifiedCandidates = candidates.filter(c => c.user.isVerified);
    if (verifiedCandidates.length === 0) {
      throw new ApiError(403, 'NOT_VERIFIED', 'Account not verified');
    }

    for (const {user, type} of verifiedCandidates) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) continue;

      const accessToken: string = jwt.sign(
        {userId: user.id, type},
        env.JWT_SECRET,
        {expiresIn: '15m'}
      );

      const refreshToken = jwt.sign(
        {userId: user.id, type},
        env.JWT_REFRESH_SECRET,
        {expiresIn: '7d'}
      );

      return {accessToken, refreshToken, user, userType: type};
    }

    throw new ApiError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password'
    );
  },

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
        type?: 'customer' | 'cashier' | 'admin';
      };

      const tokenType = payload.type;

      let userType: 'customer' | 'cashier' | 'admin' | null = null;
      let user: any = null;

      if (tokenType) {
        userType = tokenType;
        user = await (tokenType === 'customer'
          ? customerRepository.findById(payload.userId)
          : tokenType === 'cashier'
            ? cashierRepository.findById(payload.userId)
            : adminRepository.findById(payload.userId));
      } else {
        const [customer, cashier, admin] = await Promise.all([
          customerRepository.findById(payload.userId),
          cashierRepository.findById(payload.userId),
          adminRepository.findById(payload.userId)
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
        throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token');
      }

      if (!user.isVerified) {
        throw new ApiError(403, 'NOT_VERIFIED', 'Email not verified');
      }

      // A password change signs out every other device: refresh tokens issued
      // before it no longer work.
      const changedAt = user.passwordChangedAt as Date | null | undefined;
      const issuedAt = (payload as {iat?: number}).iat;
      if (
        changedAt &&
        issuedAt &&
        issuedAt < Math.floor(changedAt.getTime() / 1000)
      ) {
        throw new ApiError(401, 'SESSION_REVOKED', 'Session expired. Please sign in again.');
      }

      const accessToken = jwt.sign(
        {userId: user.id, type: userType},
        env.JWT_SECRET,
        {expiresIn: '15m'}
      );

      // Only handed out to mobile clients (see authController.refresh); the
      // web keeps its existing refresh cookie.
      const nextRefreshToken = jwt.sign(
        {userId: user.id, type: userType},
        env.JWT_REFRESH_SECRET,
        {expiresIn: '7d'}
      );

      return {accessToken, refreshToken: nextRefreshToken};
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token');
    }
  },

  async changePassword(
    userId: string,
    type: 'admin' | 'cashier' | 'customer',
    currentPassword: string,
    newPassword: string
  ) {
    const repo =
      type === 'cashier'
        ? cashierRepository
        : type === 'customer'
          ? customerRepository
          : adminRepository;
    const user = await repo.findById(userId);
    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      throw new ApiError(
        400,
        'INVALID_PASSWORD',
        'Current password is incorrect'
      );
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new ApiError(
        400,
        'SAME_PASSWORD',
        'New password must be different from your current password'
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const passwordChangedAt = new Date();
    await repo.updateProfile(user.id, {passwordHash, passwordChangedAt} as any);

    // Let the mailbox owner know, in case someone else made the change.
    const notice = accountNoticeEmailTemplate({
      kind: 'password_changed',
      recipientName: (user as {firstName?: string}).firstName
    });
    emailService
      .sendEmail({to: user.email, ...notice})
      .catch(err => console.error('[auth] password-changed email failed', err));

    // Fresh tokens for the device that made the change, so only the OTHER
    // devices are signed out.
    const accessToken = jwt.sign({userId: user.id, type}, env.JWT_SECRET, {
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign(
      {userId: user.id, type},
      env.JWT_REFRESH_SECRET,
      {expiresIn: '7d'}
    );
    return {accessToken, refreshToken};
  },

  /**
   * Everything we hold about a customer, in a machine-readable file (right to
   * data portability). Credentials and one-time codes are never included.
   */
  async exportCustomerData(customerId: string) {
    const [
      {OrderModel},
      {ReviewModel},
      {RewardRedemptionModel},
      {NotificationModel},
      {CartModel}
    ] = await Promise.all([
      import('../models/Order.model'),
      import('../models/Review.model'),
      import('../models/RewardRedemption.model'),
      import('../models/Notification.model'),
      import('../models/Cart.model')
    ]);

    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const [orders, reviews, rewardRedemptions, notifications, cart] =
      await Promise.all([
        OrderModel.find({customerId}).sort({createdAt: -1}).lean().exec(),
        ReviewModel.find({customerId})
          .select('-moderation -isAutoRejected -moderatedBy')
          .sort({createdAt: -1})
          .lean()
          .exec(),
        RewardRedemptionModel.find({customerId})
          .sort({createdAt: -1})
          .lean()
          .exec(),
        NotificationModel.find({target: 'customer', customerId})
          .sort({createdAt: -1})
          .lean()
          .exec(),
        CartModel.findOne({customerId}).lean().exec()
      ]);

    const {
      passwordHash: _passwordHash,
      verificationCode: _verificationCode,
      verificationExpiry: _verificationExpiry,
      passwordChangedAt: _passwordChangedAt,
      __v: _v,
      ...profile
    } = customer.toObject() as unknown as Record<string, unknown>;

    return {
      exportedAt: new Date().toISOString(),
      format: 'DonClaudios personal data export v1',
      profile,
      orders,
      reviews,
      rewardRedemptions,
      notifications,
      cart
    };
  },

  /**
   * Permanently deletes a customer account after re-checking the password.
   * Personal data is removed; orders are kept only as anonymous sales records
   * (the store needs them for accounting), so totals and reports stay right.
   */
  async deleteCustomerAccount(customerId: string, password: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const match = await bcrypt.compare(password, customer.passwordHash);
    if (!match) {
      throw new ApiError(400, 'INVALID_PASSWORD', 'Password is incorrect');
    }

    const [
      {OrderModel},
      {ReviewModel},
      {RewardRedemptionModel},
      {NotificationModel},
      {CartModel},
      {PushSubscriptionModel},
      {OrderMessageModel},
      {SupportConversationModel},
      {SupportMessageModel}
    ] = await Promise.all([
      import('../models/Order.model'),
      import('../models/Review.model'),
      import('../models/RewardRedemption.model'),
      import('../models/Notification.model'),
      import('../models/Cart.model'),
      import('../models/PushSubscription.model'),
      import('../models/OrderMessage.model'),
      import('../models/SupportConversation.model'),
      import('../models/SupportMessage.model')
    ]);

    // An order the kitchen is still working on needs a way to reach the
    // customer, so it must finish (or be cancelled) first.
    const activeOrders = await OrderModel.countDocuments({
      customerId,
      status: {$in: ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way']}
    }).exec();
    if (activeOrders > 0) {
      throw new ApiError(
        409,
        'ACTIVE_ORDERS',
        'You still have an order in progress. Please wait until it is completed or cancelled before deleting your account.'
      );
    }

    const FORMER = 'Former customer';
    const conversations = await SupportConversationModel.find({customerId})
      .select('_id')
      .lean()
      .exec();
    const conversationIds = conversations.map(c => c._id);

    // Reviews first: their name fields are matched by customerId.
    await ReviewModel.updateMany({customerId}, {$set: {customerName: FORMER}}).exec();
    await ReviewModel.updateMany(
      {customerId, 'messages.authorType': 'customer'},
      {$set: {'messages.$[m].senderName': FORMER}},
      {arrayFilters: [{'m.authorType': 'customer'}]}
    ).exec();

    await Promise.all([
      OrderModel.updateMany(
        {customerId},
        {
          $set: {customerId: null},
          $unset: {
            'guestInfo.phoneNumber': '',
            'guestInfo.address': '',
            'guestInfo.email': ''
          }
        }
      ).exec(),
      OrderMessageModel.updateMany(
        {customerId},
        {$set: {customerId: null, senderName: FORMER}}
      ).exec(),
      conversationIds.length
        ? SupportMessageModel.updateMany(
            {conversationId: {$in: conversationIds}, senderType: 'customer'},
            {$set: {senderName: FORMER}}
          ).exec()
        : Promise.resolve(),
      SupportConversationModel.updateMany(
        {customerId},
        {$set: {customerId: null, guestName: FORMER, guestContact: null}}
      ).exec(),
      RewardRedemptionModel.deleteMany({customerId}).exec(),
      NotificationModel.deleteMany({target: 'customer', customerId}).exec(),
      CartModel.deleteMany({customerId}).exec(),
      PushSubscriptionModel.deleteMany({
        userId: customerId,
        userType: 'customer'
      }).exec()
    ]);

    await customerRepository.deleteById(customerId);

    const notice = accountNoticeEmailTemplate({
      kind: 'account_deleted',
      recipientName: customer.firstName
    });
    emailService
      .sendEmail({to: customer.email, ...notice})
      .catch(err => console.error('[auth] account-deleted email failed', err));
  }
};
