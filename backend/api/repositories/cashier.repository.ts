import mongoose from 'mongoose';
import {CashierModel, CashierDocument} from '../models/Cashier.model';
import {phoneVariants} from '../utils/phone';
import {onlineSinceFilter, PRESENCE_TOUCH_MS} from '../utils/presence';

export const cashierRepository = {
  findByEmail: (email: string) =>
    CashierModel.findOne({email: email.toLowerCase()}).exec(),

  findByUsername: (username: string) =>
    CashierModel.findOne({username: username.trim()}).exec(),

  findByPhoneNumber: (phoneNumber: string) =>
    CashierModel.findOne({phoneNumber: {$in: phoneVariants(phoneNumber)}}).exec(),

  findByEmailOrPhoneNumber: (identifier: string) =>
    CashierModel.findOne({
      $or: [
        {email: identifier.toLowerCase()},
        {phoneNumber: {$in: phoneVariants(identifier)}}
      ]
    }).exec(),

  findById: (id: string) => CashierModel.findById(id).exec(),

  listAll: () => CashierModel.find({}).sort({createdAt: -1}).exec(),

  create: (data: Partial<CashierDocument>) => CashierModel.create(data),

  updateById: (id: string, data: Partial<CashierDocument>) =>
    CashierModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  updateProfile: (
    id: string,
    data: Partial<
      Pick<
        CashierDocument,
        'firstName' | 'lastName' | 'phoneNumber' | 'address' | 'profilePhoto'
      >
    >
  ) => CashierModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => CashierModel.findByIdAndDelete(id).exec(),

  /** Heartbeat / sign-in (date) or sign-out (null). Skips the `updatedAt` bump. */
  setLastSeen: (id: string, at: Date | null) =>
    CashierModel.updateOne({_id: id}, {$set: {lastSeenAt: at}}, {timestamps: false}).exec(),

  /** False when the cashier was deleted or disabled by the owner (auth middleware). */
  isActive: async (id: string) => {
    if (!mongoose.isValidObjectId(id)) return false;
    const cashier = await CashierModel.findById(id, {isDisabled: 1}).lean().exec();
    return !!cashier && !cashier.isDisabled;
  },

  /**
   * isActive for a cashier's own request, which also counts as presence: the
   * web cashier and the POS app already poll every 20-30s, so no separate
   * heartbeat request is needed. lastSeenAt is written at most once per
   * PRESENCE_TOUCH_MS, so most requests cost the single read.
   */
  checkActiveAndTouch: async (id: string) => {
    if (!mongoose.isValidObjectId(id)) return false;
    const cashier = await CashierModel.findById(id, {isDisabled: 1, lastSeenAt: 1}).lean().exec();
    if (!cashier || cashier.isDisabled) return false;
    const last = cashier.lastSeenAt ? new Date(cashier.lastSeenAt).getTime() : 0;
    if (Date.now() - last >= PRESENCE_TOUCH_MS) {
      await CashierModel.updateOne({_id: id}, {$set: {lastSeenAt: new Date()}}, {timestamps: false}).exec();
    }
    return true;
  },

  /** Ids of cashiers whose last heartbeat is inside the presence timeout. */
  listOnlineIds: async () =>
    (await CashierModel.find(onlineSinceFilter(), {_id: 1}).lean().exec()).map(c => String(c._id))
};
