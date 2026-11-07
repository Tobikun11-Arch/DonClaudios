import mongoose, {Schema} from 'mongoose';
import type {PaymentChannel} from '../config/paymentFees';

/**
 * One document per Xendit invoice.
 *
 *   PENDING        -> invoice created, waiting for the customer
 *   PAID           -> Xendit confirmed the payment (webhook + re-fetch)
 *   EXPIRED        -> customer did not pay in time (Xendit expired it)
 *   CANCELLED      -> we expired it ourselves (customer switched channel /
 *                     chose cash / order cancelled before paying)
 *   REFUND_PENDING -> refund requested from Xendit
 *   REFUNDED       -> refund succeeded
 *   REFUND_FAILED  -> refund failed; owner must refund manually
 */
export type PaymentRecordStatus =
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'REFUND_FAILED';

export type PaymentKind = 'full' | 'down_payment' | 'balance';

export interface PaymentDocument extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  kind: PaymentKind;
  channel: PaymentChannel;
  /** Order portion covered by this payment. */
  amount: number;
  transactionFee: number;
  /** amount + transactionFee: what Xendit bills. */
  charge: number;
  externalId: string;
  xenditInvoiceId: string;
  invoiceUrl: string;
  status: PaymentRecordStatus;
  expiresAt: Date;
  paidAt?: Date | null;
  paidChannel?: string | null;
  refundId?: string | null;
  refundedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    kind: {
      type: String,
      enum: ['full', 'down_payment', 'balance'],
      required: true
    },
    channel: {
      type: String,
      enum: ['gcash', 'maya', 'grabpay', 'shopeepay', 'card'],
      required: true
    },
    amount: {type: Number, required: true},
    transactionFee: {type: Number, required: true, default: 0},
    charge: {type: Number, required: true},
    externalId: {type: String, required: true},
    xenditInvoiceId: {type: String, required: true},
    invoiceUrl: {type: String, required: true},
    status: {
      type: String,
      enum: [
        'PENDING',
        'PAID',
        'EXPIRED',
        'CANCELLED',
        'REFUND_PENDING',
        'REFUNDED',
        'REFUND_FAILED'
      ],
      default: 'PENDING'
    },
    expiresAt: {type: Date, required: true},
    paidAt: {type: Date, default: null},
    paidChannel: {type: String, default: null},
    refundId: {type: String, default: null},
    refundedAt: {type: Date, default: null}
  },
  {timestamps: true}
);

PaymentSchema.index({orderId: 1, createdAt: -1});
PaymentSchema.index({xenditInvoiceId: 1}, {unique: true});
PaymentSchema.index({externalId: 1}, {unique: true});
PaymentSchema.index({refundId: 1}, {sparse: true});

export const PaymentModel = mongoose.model<PaymentDocument>(
  'Payment',
  PaymentSchema,
  'payments'
);
