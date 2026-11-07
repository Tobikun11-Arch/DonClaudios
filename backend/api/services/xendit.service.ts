import {env} from '../config/env';
import {ApiError} from '../utils/error';

/**
 * Thin Xendit REST client (Invoice + Refund APIs). Uses fetch with Basic auth
 * (secret key as username, empty password) so there is no SDK dependency.
 *
 * Docs: https://docs.xendit.co (Invoice: /v2/invoices, Refund: /refunds)
 */

export type XenditInvoiceStatus = 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED';

export type XenditInvoice = {
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  paid_amount?: number;
  invoice_url: string;
  expiry_date: string;
  payment_method?: string;
  payment_channel?: string;
  paid_at?: string;
};

export type XenditRefund = {
  id: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  amount: number;
  invoice_id?: string;
  reference_id?: string;
  failure_code?: string | null;
};

export function isXenditConfigured(): boolean {
  return Boolean(env.XENDIT_SECRET_KEY && env.XENDIT_WEBHOOK_TOKEN);
}

function assertConfigured(): string {
  if (!isXenditConfigured()) {
    throw new ApiError(
      503,
      'PAYMENTS_NOT_CONFIGURED',
      'Online payment is not available yet. Please contact the store.'
    );
  }
  return env.XENDIT_SECRET_KEY as string;
}

async function xenditRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const key = assertConfigured();
  const res = await fetch(`${env.XENDIT_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    console.error(
      `[xendit] ${method} ${path} failed (${res.status})`,
      json ?? text
    );
    throw new ApiError(
      502,
      'PAYMENT_GATEWAY_ERROR',
      json?.message ?? 'The payment provider could not process the request',
      {xenditCode: json?.error_code}
    );
  }
  return json as T;
}

export const xenditService = {
  createInvoice(input: {
    externalId: string;
    amount: number;
    orderAmount: number;
    transactionFee: number;
    description: string;
    durationSeconds: number;
    paymentMethods: string[];
    successRedirectUrl?: string;
    failureRedirectUrl?: string;
    customer?: {
      given_names?: string;
      surname?: string;
      email?: string;
      mobile_number?: string;
    };
  }) {
    return xenditRequest<XenditInvoice>('POST', '/v2/invoices', {
      external_id: input.externalId,
      amount: input.amount,
      currency: 'PHP',
      description: input.description,
      invoice_duration: input.durationSeconds,
      payment_methods: input.paymentMethods,
      success_redirect_url: input.successRedirectUrl,
      failure_redirect_url: input.failureRedirectUrl,
      customer: input.customer,
      // Breakdown shown on Xendit's hosted page. items + fees === amount.
      items: [{name: input.description, quantity: 1, price: input.orderAmount}],
      fees:
        input.transactionFee > 0
          ? [{type: 'Transaction fee', value: input.transactionFee}]
          : undefined
    });
  },

  getInvoice(invoiceId: string) {
    return xenditRequest<XenditInvoice>(
      'GET',
      `/v2/invoices/${encodeURIComponent(invoiceId)}`
    );
  },

  expireInvoice(invoiceId: string) {
    return xenditRequest<XenditInvoice>(
      'POST',
      `/invoices/${encodeURIComponent(invoiceId)}/expire!`
    );
  },

  createRefund(input: {
    invoiceId: string;
    referenceId: string;
    amount: number;
    reason?: string;
  }) {
    return xenditRequest<XenditRefund>(
      'POST',
      '/refunds',
      {
        invoice_id: input.invoiceId,
        reference_id: input.referenceId,
        amount: input.amount,
        currency: 'PHP',
        reason: input.reason ?? 'CANCELLATION'
      },
      // Same idempotency key on a retry -> Xendit returns the original refund.
      {'Idempotency-key': input.referenceId}
    );
  }
};
