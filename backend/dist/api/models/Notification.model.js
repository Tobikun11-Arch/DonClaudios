"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const NotificationSchema = new mongoose_1.Schema({
    target: {
        type: String,
        enum: ['customer', 'admin'],
        required: true
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    type: {
        type: String,
        enum: ['review_reply', 'review_submitted', 'low_stock', 'order_status'],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    reviewId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Review', default: null },
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order', default: null },
    link: { type: String, default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
}, { timestamps: true });
NotificationSchema.index({ target: 1, customerId: 1, read: 1 });
NotificationSchema.index({ target: 1, adminId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });
exports.NotificationModel = mongoose_1.default.model('Notification', NotificationSchema, 'notifications');
