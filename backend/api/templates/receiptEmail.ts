type ReceiptItem = {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type ReceiptEmailParams = {
  customerName: string;
  orderNumber: string;
  orderDatetime: string;
  orderType: string;
  staffName?: string;
  paymentMethod: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountTendered?: number;
  change?: number;
  businessName: string;
  businessAddress?: string;
  businessContact?: string;
};

function money(value: number): string {
  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function receiptEmailTemplate({
  customerName,
  orderNumber,
  orderDatetime,
  orderType,
  staffName,
  paymentMethod,
  items,
  subtotal,
  discount,
  total,
  amountTendered,
  change,
  businessName,
  businessAddress,
  businessContact
}: ReceiptEmailParams) {
  const subject = `Your DonClaudio's order summary ${orderNumber}`;
  const safeCustomer = customerName?.trim() || 'there';

  const itemRows = items
    .map(
      item => `
        <tr>
          <td style="padding:8px 0; border-top:1px solid #f3f4f6;">${item.name}</td>
          <td style="padding:8px 0; border-top:1px solid #f3f4f6;" align="center">${item.quantity}</td>
          <td style="padding:8px 0; border-top:1px solid #f3f4f6;" align="right">${money(
            item.price
          )}</td>
          <td style="padding:8px 0; border-top:1px solid #f3f4f6;" align="right">${money(
            item.subtotal
          )}</td>
        </tr>
      `
    )
    .join('\n');

  const cashLines =
    amountTendered !== undefined
      ? `
        <tr>
          <td style="padding:4px 0;">Amount Tendered</td>
          <td style="padding:4px 0;" align="right">${money(amountTendered)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Change</td>
          <td style="padding:4px 0;" align="right">${money(change ?? 0)}</td>
        </tr>
      `
      : '';

  const text =
    `Hi ${safeCustomer},\n\n` +
    `Thanks for your order (${orderNumber}) placed on ${orderDatetime}. ` +
    `Here is a summary for your records. This is not an official receipt / invoice.\n\n` +
    `Items:\n` +
    items
      .map(
        item =>
          `  - ${item.name} x${item.quantity} @ ${money(item.price)} = ${money(
            item.subtotal
          )}`
      )
      .join('\n') +
    `\n\nSubtotal: ${money(subtotal)}\n` +
    (discount > 0 ? `Discount: -${money(discount)}\n` : '') +
    `Total: ${money(total)}\n\n` +
    `Order type: ${orderType}\n` +
    `Payment method: ${paymentMethod}\n` +
    (staffName ? `Served by: ${staffName}\n` : '') +
    `\nFor concerns about this order, please contact us at ${
      businessContact || 'the store'
    }.\n\n` +
    `${businessName}${businessAddress ? ` · ${businessAddress}` : ''}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#1f2937; padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><span style="color:#ffffff; font-size:20px; font-weight:bold;">${businessName}</span></td>
                  <td align="right"><span style="color:#9ca3af; font-size:12px;">Order Summary</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <p style="margin:0 0 4px 0; font-size:16px; color:#111827;">Hi <strong>${safeCustomer}</strong>,</p>
              <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.6;">
                Thanks for your order! Here's a summary for your records. This is not an official receipt / invoice.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px; color:#374151;">
                <tr><td style="padding:4px 0;"><strong>Order No.</strong></td><td style="padding:4px 0;" align="right">${orderNumber}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Date &amp; Time</strong></td><td style="padding:4px 0;" align="right">${orderDatetime}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Order Type</strong></td><td style="padding:4px 0;" align="right">${orderType}</td></tr>
                ${
                  staffName
                    ? `<tr><td style="padding:4px 0;"><strong>Served / Placed by</strong></td><td style="padding:4px 0;" align="right">${staffName}</td></tr>`
                    : ''
                }
                <tr><td style="padding:4px 0;"><strong>Payment Method</strong></td><td style="padding:4px 0;" align="right">${paymentMethod}</td></tr>
                <tr>
                  <td style="padding:4px 0;"><strong>Status</strong></td>
                  <td style="padding:4px 0;" align="right">
                    <span style="background-color:#dcfce7; color:#166534; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:bold;">Completed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:20px 32px 0 32px;"><hr style="border:none; border-top:1px solid #e5e7eb;"></td></tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px; color:#111827;">
                <tr style="color:#6b7280; font-size:11px; text-transform:uppercase;">
                  <td style="padding:0 0 8px 0;" align="left">Item</td>
                  <td style="padding:0 0 8px 0;" align="center">Qty</td>
                  <td style="padding:0 0 8px 0;" align="right">Price</td>
                  <td style="padding:0 0 8px 0;" align="right">Subtotal</td>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px; color:#374151;">
                <tr><td style="padding:4px 0;">Subtotal</td><td style="padding:4px 0;" align="right">${money(subtotal)}</td></tr>
                ${
                  discount > 0
                    ? `<tr><td style="padding:4px 0;">Discount</td><td style="padding:4px 0;" align="right">-${money(discount)}</td></tr>`
                    : ''
                }
                <tr>
                  <td style="padding:10px 0 4px 0; font-size:15px; font-weight:bold; color:#111827; border-top:1px solid #e5e7eb;">Total</td>
                  <td style="padding:10px 0 4px 0; font-size:15px; font-weight:bold; color:#111827; border-top:1px solid #e5e7eb;" align="right">${money(total)}</td>
                </tr>
                ${cashLines}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0; font-size:11px; color:#9ca3af; line-height:1.6;">
                This order summary is provided for your reference only and does not serve as an official receipt or invoice.
                For concerns about this order, please reply to this email or contact us at ${
                  businessContact || 'the store'
                }.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb; padding:20px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">${businessName}${
                businessAddress ? ` · ${businessAddress}` : ''
              }</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {subject, text, html};
}
