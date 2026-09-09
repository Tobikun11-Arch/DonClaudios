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
      const {closingTime, advanceCloseMinutes, isManuallyClosed, manualCloseReason} = req.body;

      const settings = await storeStatusService.updateStoreSettings({
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed,
        manualCloseReason
      });

      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  },

  async toggleManualClose(req: Request, res: Response, next: NextFunction) {
    try {
      const {isManuallyClosed, reason} = req.body;

      const settings = await storeStatusService.updateStoreSettings({
        isManuallyClosed,
        manualCloseReason: reason || ''
      });

      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  }
};
