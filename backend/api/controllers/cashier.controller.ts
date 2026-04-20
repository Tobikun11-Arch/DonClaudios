import {Request, Response, NextFunction} from 'express';
import {cashierService} from '../services/cashier.service';

export const cashierController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierService.createCashier(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
};
