import {
  PaymentModel,
  type PaymentDocument,
  type PaymentRecordStatus
} from '../models/Payment.model';

export const paymentRepository = {
  create: (data: Partial<PaymentDocument>) => PaymentModel.create(data),

  findById: (id: string) => PaymentModel.findById(id).exec(),

  findByInvoiceId:(xenditInvoiceId: string) =>
    PaymentModel.findOne({xenditInvoiceId}).exec(),

  findByRefundId: (refundId: string) =>
    PaymentModel.findOne({refundId}).exec(),

  listByOrderId: (orderId: string) =>
    PaymentModel.find({orderId}).sort({createdAt: 1}).exec(),

  listByOrderIds: (orderIds: string[]) =>
    PaymentModel.find({orderId: {$in: orderIds}}).sort({createdAt: 1}).exec(),

  listByOrderAndStatus: (orderId: string, statuses: PaymentRecordStatus[]) =>
    PaymentModel.find({orderId, status: {$in: statuses}}).exec(),

  /**
   * Atomic status transition. Only succeeds when the record is currently in
   * one of `from`, so a retried webhook (or a race between the webhook and a
   * cancel) applies exactly once. Returns the updated doc, or null when the
   * transition did not happen.
   */
  transition: (
    id: string,
    from: PaymentRecordStatus[],
    to: PaymentRecordStatus,
    extra: Partial<PaymentDocument> = {}
  ) =>
    PaymentModel.findOneAndUpdate(
      {_id: id, status: {$in: from}},
      {$set: {...extra, status: to}},
      {new: true}
    ).exec()
};
