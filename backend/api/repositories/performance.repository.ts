import {PerformanceDailyModel, PerformanceDailyDocument} from '../models/PerformanceDaily.model';

export const performanceRepository = {
  findByDate: (date: string) => PerformanceDailyModel.findOne({date}).exec(),

  listRecent: (limit = 30) =>
    PerformanceDailyModel.find({}).sort({date: -1}).limit(limit).exec(),

  upsert: (date: string, data: Partial<PerformanceDailyDocument>) =>
    PerformanceDailyModel.updateOne({date}, {$set: data}, {upsert: true}).exec()
};
