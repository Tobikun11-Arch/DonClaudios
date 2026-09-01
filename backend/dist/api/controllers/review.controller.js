"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewController = void 0;
const error_1 = require("../utils/error");
const review_service_1 = require("../services/review.service");
exports.reviewController = {
    async listPublic(_req, res, next) {
        try {
            const reviews = await review_service_1.reviewService.listPublic();
            res.status(200).json({ reviews });
        }
        catch (error) {
            next(error);
        }
    },
    async listAdmin(_req, res, next) {
        try {
            const reviews = await review_service_1.reviewService.listForAdmin();
            res.status(200).json({ reviews });
        }
        catch (error) {
            next(error);
        }
    },
    async listMyReviews(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const reviews = await review_service_1.reviewService.listMyReviews(req.auth.userId);
            res.status(200).json({ reviews });
        }
        catch (error) {
            next(error);
        }
    },
    async createReview(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const review = await review_service_1.reviewService.createById(req.auth.userId, req.body);
            res.status(201).json({ review });
        }
        catch (error) {
            next(error);
        }
    },
    async updateStatus(req, res, next) {
        try {
            const review = await review_service_1.reviewService.updateStatusById(req.params.id, req.body.status);
            res.status(200).json({ review });
        }
        catch (error) {
            next(error);
        }
    },
    async reply(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const review = await review_service_1.reviewService.replyToReview(req.params.id, req.auth.userId, req.body.reply);
            res.status(200).json({ review });
        }
        catch (error) {
            next(error);
        }
    },
    async customerReply(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const review = await review_service_1.reviewService.replyByCustomer(req.params.id, req.auth.userId, req.body.reply);
            res.status(200).json({ review });
        }
        catch (error) {
            next(error);
        }
    }
};
