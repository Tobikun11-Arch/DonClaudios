import {Request, Response, NextFunction} from 'express';
import {storeStatusService} from '../services/storeStatus.service';
import {ApiError} from '../utils/error';

export const storeStatusController = {
  async getStoreStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const status = await storeStatusService.getStoreStatus();
      res.status(200).json({status});
    } catch (error) {
      next(error);
    }
  },

  async updateStoreSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        openingTime,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed,
        isManuallyOpen,
        forceOpen,
        manualOverride
      } = req.body;

      const settings = await storeStatusService.updateStoreSettings({
        openingTime,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed,
        isManuallyOpen,
        forceOpen,
        manualOverride
      });

      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  },

  async toggleManualClose(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        isManuallyClosed,
        isManuallyOpen,
        forceOpen,
        manualOverride,
        open,
        isOpen
      } = req.body ?? {};

      const wantsOpen =
        isManuallyOpen !== undefined ||
        forceOpen !== undefined ||
        manualOverride !== undefined ||
        open !== undefined ||
        isOpen !== undefined;

      let settings;
      if (wantsOpen) {
        const desired = isManuallyOpen ?? forceOpen ?? open ?? isOpen ?? true;
        const overrideState =
          manualOverride === 'open'
            ? true
            : manualOverride === 'closed'
              ? false
              : Boolean(desired);
        settings = await storeStatusService.updateStoreSettings({
          isManuallyOpen: overrideState,
          isManuallyClosed: overrideState ? false : isManuallyClosed,
          manualOverride: manualOverride ?? (overrideState ? 'open' : undefined)
        });
      } else {
        const nextClosed = isManuallyClosed ?? true;
        settings = await storeStatusService.updateStoreSettings({
          isManuallyClosed: nextClosed
        });
      }

      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  },

  async toggleManualOpen(req: Request, res: Response, next: NextFunction) {
    try {
      const {isManuallyOpen, forceOpen, open, isOpen, manualOverride} =
        req.body ?? {};
      const desired =
        isManuallyOpen ?? forceOpen ?? open ?? isOpen ?? true;

      const overrideState =
        manualOverride === 'open'
          ? true
          : manualOverride === 'closed'
            ? false
            : Boolean(desired);

      const settings = await storeStatusService.updateStoreSettings({
        isManuallyOpen: overrideState,
        isManuallyClosed: overrideState ? false : undefined,
        manualOverride: manualOverride ?? (overrideState ? 'open' : undefined)
      });

      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  }
};