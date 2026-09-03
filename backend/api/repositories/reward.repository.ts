import {
  RewardRedemptionDocument,
  RewardRedemptionModel
} from '../models/RewardRedemption.model';

export const rewardRedemptionRepository = {
  create: (data: Partial<RewardRedemptionDocument>) =>
    RewardRedemptionModel.create(data),

  listByCustomerId: (customerId: string) =>
    RewardRedemptionModel.find({customerId})
      .sort({createdAt: -1})
      .exec(),

  findByCustomerId: (customerId: string, redemptionId: string) =>
    RewardRedemptionModel.findOne({_id: redemptionId, customerId}).exec()
};
