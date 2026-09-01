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
exports.SiteSettingModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StatItemSchema = new mongoose_1.Schema({
    value: { type: String, required: true },
    label: { type: String, required: true }
}, { _id: false });
const HighlightImageSchema = new mongoose_1.Schema({
    url: { type: String, default: '' },
    alt: { type: String, default: '' }
}, { _id: false });
const ReviewItemSchema = new mongoose_1.Schema({
    rating: { type: Number, default: 5 },
    quote: { type: String, default: '' },
    name: { type: String, default: '' },
    tag: { type: String, default: '' }
}, { _id: false });
const SectionStyleSchema = new mongoose_1.Schema({
    backgroundColor: { type: String, default: '' },
    textColor: { type: String, default: '' },
    fontFamily: { type: String, default: '' }
}, { _id: false });
const SiteSettingSchema = new mongoose_1.Schema({
    hero: {
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        ctaText: { type: String, default: '' },
        ctaLink: { type: String, default: '/order' },
        stats: { type: [StatItemSchema], default: [] }
    },
    highlights: {
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        images: { type: [HighlightImageSchema], default: [] }
    },
    about: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        stats: { type: [StatItemSchema], default: [] }
    },
    promo: {
        title: { type: String, default: 'Special Deals' },
        subtitle: { type: String, default: 'Check out our latest promos and save on your favorite lechon!' }
    },
    reviews: {
        heading: { type: String, default: 'What Our Customers Say' },
        subheading: { type: String, default: 'Real stories from families who celebrated with our lechon' },
        featured: { type: ReviewItemSchema, default: () => ({}) },
        items: { type: [ReviewItemSchema], default: [] }
    },
    contact: {
        address: { type: String, default: '' },
        phones: { type: [String], default: [] },
        email: { type: String, default: '' },
        hours: { type: String, default: '' }
    },
    footer: {
        brandName: { type: String, default: '' },
        description: { type: String, default: '' },
        phones: { type: [String], default: [] },
        email: { type: String, default: '' },
        address: { type: String, default: '' },
        hours: { type: String, default: '' }
    },
    colors: {
        primary: { type: String, default: '#3c5e45' },
        accent: { type: String, default: '#fbd897' },
        textColor: { type: String, default: '#3c5e45' },
        backgroundColor: { type: String, default: '#ffffff' }
    },
    sectionStyles: {
        type: Map,
        of: SectionStyleSchema,
        default: () => ({})
    }
}, { timestamps: true });
exports.SiteSettingModel = mongoose_1.default.model('SiteSetting', SiteSettingSchema, 'site_settings');
