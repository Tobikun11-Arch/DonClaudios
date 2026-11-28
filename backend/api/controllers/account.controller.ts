import type {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {CustomerModel} from '../models/Customer.model';
import {customerRepository} from '../repositories/customer.repository';
import {accountSecurityService, needsPhoneVerification} from '../services/accountSecurity.service';
import {sanitizeAcquisition} from '../config/acquisition';
import {newsletterService} from '../services/newsletter.service';
import {completeSignIn} from './auth.controller';

function customerId(req: Request): string {
  if (!req.auth?.userId || req.auth.type !== 'customer') {
    throw new ApiError(403, 'FORBIDDEN', 'Customer access required');
  }
  return String(req.auth.userId);
}

/**
 * Customer account security: Google sign-in and linking, setting a first
 * password, verifying a phone while signed in, optional two-step sign-in
 * (email code) and the order email preference.
 */
export const accountController = {
  async googleSignIn(req: Request, res: Response, next: NextFunction) {
    try {
      const {customer, created} = await accountSecurityService.signInWithGoogle(
        req.body.credential,
        sanitizeAcquisition(req.body.acquisition)
      );

      if (accountSecurityService.isMfaOn(customer, 'customer')) {
        res.status(200).json(await accountSecurityService.beginSignInChallenge(customer));
        return;
      }

      await completeSignIn(req, res, customer, 'customer', {
        created,
        needsPhoneVerification: needsPhoneVerification(customer)
      });
    } catch (error) {
      next(error);
    }
  },

  async mfaVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = accountSecurityService.readChallenge(req.body.challengeToken);
      const {customer, usedBackup, backupCodesLeft} = await accountSecurityService.checkMfaCode(
        userId,
        req.body.code,
        true
      );
      await completeSignIn(req, res, customer, 'customer', {
        usedBackupCode: usedBackup,
        backupCodesLeft,
        needsPhoneVerification: needsPhoneVerification(customer)
      });
    } catch (error) {
      next(error);
    }
  },

  async mfaResend(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = accountSecurityService.readChallenge(req.body.challengeToken);
      const sent = await accountSecurityService.sendMfaCode(userId);
      res.status(200).json(sent);
    } catch (error) {
      next(error);
    }
  },

  async linkGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await accountSecurityService.linkGoogle(customerId(req), req.body.credential);
      res.status(200).json({googleLinked: true, ...result});
    } catch (error) {
      next(error);
    }
  },

  async unlinkGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      await accountSecurityService.unlinkGoogle(customerId(req));
      res.status(200).json({googleLinked: false});
    } catch (error) {
      next(error);
    }
  },

  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await accountSecurityService.setPassword(customerId(req), req.body.newPassword);
      res.status(200).json({hasPassword: true});
    } catch (error) {
      next(error);
    }
  },

  async sendPhoneCode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await accountSecurityService.sendPhoneCode(customerId(req), req.body.phoneNumber);
      res.status(200).json(result ?? {sent: true});
    } catch (error) {
      next(error);
    }
  },

  async verifyPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await accountSecurityService.verifyPhone(
        customerId(req),
        req.body.phoneNumber,
        req.body.code,
        req.body.viaEmail === true
      );
      res.status(200).json({phoneVerified: true, needsPhoneVerification: false, ...result});
    } catch (error) {
      next(error);
    }
  },

  async sendMfaCode(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await accountSecurityService.sendMfaCode(customerId(req)));
    } catch (error) {
      next(error);
    }
  },

  async enableMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const {backupCodes} = await accountSecurityService.enableMfa(customerId(req), req.body.code);
      res.status(200).json({mfaEnabled: true, backupCodes});
    } catch (error) {
      next(error);
    }
  },

  async startTotpSetup(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await accountSecurityService.startTotpSetup(customerId(req)));
    } catch (error) {
      next(error);
    }
  },

  async enableTotp(req: Request, res: Response, next: NextFunction) {
    try {
      const {backupCodes} = await accountSecurityService.enableTotp(customerId(req), req.body.code);
      res.status(200).json({mfaEnabled: true, method: 'totp', backupCodes});
    } catch (error) {
      next(error);
    }
  },

  async disableMfa(req: Request, res: Response, next: NextFunction) {
    try {
      await accountSecurityService.disableMfa(customerId(req), req.body.code);
      res.status(200).json({mfaEnabled: false});
    } catch (error) {
      next(error);
    }
  },

  async setOrderEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = customerId(req);
      const exists = await customerRepository.findById(id);
      if (!exists) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
      await CustomerModel.updateOne({_id: id}, {$set: {orderEmailUpdates: req.body.orderEmailUpdates}}).exec();
      res.status(200).json({orderEmailUpdates: req.body.orderEmailUpdates});
    } catch (error) {
      next(error);
    }
  },

  async setNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await newsletterService.setOptIn(customerId(req), req.body.newsletterOptIn));
    } catch (error) {
      next(error);
    }
  },

  /** Public: one-click unsubscribe from a newsletter email link. */
  async newsletterUnsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await newsletterService.unsubscribe(req.body.token));
    } catch (error) {
      next(error);
    }
  }
};
