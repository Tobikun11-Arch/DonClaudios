"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoController = void 0;
const promo_service_1 = require("../services/promo.service");
const error_1 = require("../utils/error");
exports.promoController = {
    async list(_req, res, next) {
        try {
            const promos = await promo_service_1.promoService.list();
            res.status(200).json({ promos });
        }
        catch (error) {
            next(error);
        }
    },
    async listAll(_req, res, next) {
        try {
            const promos = await promo_service_1.promoService.listAll();
            res.status(200).json({ promos });
        }
        catch (error) {
            next(error);
        }
    },
    async getById(req, res, next) {
        try {
            const promo = await promo_service_1.promoService.getById(req.params.id);
            res.status(200).json({ promo });
        }
        catch (error) {
            next(error);
        }
    },
    async create(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const created = await promo_service_1.promoService.create(req.auth.userId, req.body);
            res.status(201).json({ promo: created });
        }
        catch (error) {
            next(error);
        }
    },
    async update(req, res, next) {
        try {
            const updated = await promo_service_1.promoService.update(req.params.id, req.body);
            res.status(200).json({ promo: updated });
        }
        catch (error) {
            next(error);
        }
    },
    async remove(req, res, next) {
        try {
            const result = await promo_service_1.promoService.remove(req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
};
