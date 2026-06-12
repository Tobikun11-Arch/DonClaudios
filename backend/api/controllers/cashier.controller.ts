import {Request, Response, NextFunction} from 'express';
import {cashierService} from '../services/cashier.service';

export const cashierController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const cashiers = await cashierService.listCashiers();
      res.status(200).json({cashiers});
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const cashier = await cashierService.getCashier(req.params.id);
      res.status(200).json({cashier});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierService.createCashier(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await cashierService.updateCashier(req.params.id, req.body);
      res.status(200).json({cashier: updated});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierService.deleteCashier(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
