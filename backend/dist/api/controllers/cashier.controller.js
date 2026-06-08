"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashierController = void 0;
const cashier_service_1 = require("../services/cashier.service");
exports.cashierController = {
    async list(_req, res, next) {
        try {
            const cashiers = await cashier_service_1.cashierService.listCashiers();
            res.status(200).json({ cashiers });
        }
        catch (error) {
            next(error);
        }
    },
    async getById(req, res, next) {
        try {
            const cashier = await cashier_service_1.cashierService.getCashier(req.params.id);
            res.status(200).json({ cashier });
        }
        catch (error) {
            next(error);
        }
    },
    async create(req, res, next) {
        try {
            const result = await cashier_service_1.cashierService.createCashier(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    async update(req, res, next) {
        try {
            const updated = await cashier_service_1.cashierService.updateCashier(req.params.id, req.body);
            res.status(200).json({ cashier: updated });
        }
        catch (error) {
            next(error);
        }
    },
    async remove(req, res, next) {
        try {
            const result = await cashier_service_1.cashierService.deleteCashier(req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
};
