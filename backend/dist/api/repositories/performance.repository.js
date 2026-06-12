"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceRepository = void 0;
const PerformanceDaily_model_1 = require("../models/PerformanceDaily.model");
exports.performanceRepository = {
    findByDate: (date) => PerformanceDaily_model_1.PerformanceDailyModel.findOne({ date }).exec(),
    listRecent: (limit = 30) => PerformanceDaily_model_1.PerformanceDailyModel.find({}).sort({ date: -1 }).limit(limit).exec(),
    upsert: (date, data) => PerformanceDaily_model_1.PerformanceDailyModel.updateOne({ date }, { $set: data }, { upsert: true }).exec()
};
