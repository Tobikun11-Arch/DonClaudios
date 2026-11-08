/**
 * "Your order is in!" email with the tracking number.
 *
 * Email clients block JavaScript, so the email is made "interactive" with
 * things that work everywhere: a big tap-friendly Track button, a tracking
 * number that is easy to read and copy, a "what happens next" timeline, and
 * the order at a glance. Built with tables + inline styles (what Gmail,
 * Outlook and phone mail apps reliably render) and readable on phones.
 */

export type OrderTrackingEmailItem = {
  name: string;
  quantity: number;
  lineTotal: number;
};

export type OrderTrackingEmailParams = {
  customerName: string;
  trackingNumber: string;
  orderCode: string;
  orderTypeLabel: string;
  placedAt: string;
  items: OrderTrackingEmailItem[];
  total: number;
  trackUrl: string;
  imageUrl: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
};

const BRAND = '#2d4a35';
const BRAND_SOFT = '#e9f5ee';
const CREAM = '#FFF7EA';
const ACCENT = '#fbd897';
const INK = '#1f2937';
const MUTED = '#6b7280';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value: number): string {
  return `&#8369;${(Number.isFinite(value) ? value : 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

const STEPS: Array<{title: string; text: string}> = [
  {title: 'Order received', text: 'We got your order. That’s this email!'},
  {title: 'We call to confirm', text: 'Our team calls the number you gave to confirm the details.'},
  {title: 'Pay', text: 'After confirming, pay online on your order page (or cash on pick-up).'},
  {title: 'Freshly prepared', text: 'Our kitchen roasts and prepares your order.'},
  {title: 'Ready for you', text: 'Pick it up at the store or wait for your delivery. Enjoy!'}
];

export function orderTrackingEmailTemplate(p: OrderTrackingEmailParams): {html: string; text: string} {
  const firstName = esc(p.customerName.split(' ')[0] || 'there');
  const tracking = esc(p.trackingNumber);

  const itemRows = p.items
    .map(
      item => `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:${INK};border-bottom:1px solid #f1f1f1;">
            ${esc(item.name)} <span style="color:${MUTED};">&times; ${item.quantity}</span>
          </td>
          <td align="right" style="padding:8px 0;font-size:14px;color:${INK};border-bottom:1px solid #f1f1f1;white-space:nowrap;">
            ${money(item.lineTotal)}
          </td>
        </tr>`
    )
    .join('');

  const stepRows = STEPS.map((step, i) => {
    const done = i === 0;
    const last = i === STEPS.length - 1;
    return `
        <tr>
          <td width="40" valign="top" style="padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="28" height="28" align="center" valign="middle"
                    style="width:28px;height:28px;border-radius:14px;font-size:13px;font-weight:700;
                           background:${done ? BRAND : '#ffffff'};color:${done ? '#ffffff' : BRAND};
                           border:2px solid ${BRAND};">
                  ${done ? '&#10003;' : i + 1}
                </td>
              </tr>
              ${last ? '' : `<tr><td align="center" style="padding:0;"><div style="width:2px;height:26px;background:${done ? BRAND : '#d7e6dc'};margin:0 auto;"></div></td></tr>`}
            </table>
          </td>
          <td valign="top" style="padding:3px 0 0 6px;">
            <div style="font-size:14px;font-weight:700;color:${done ? BRAND : INK};">${step.title}</div>
            <div style="font-size:13px;color:${MUTED};line-height:1.45;padding-bottom:10px;">${step.text}</div>
          </td>
        </tr>`;
  }).join('');

  const contactLine = [p.businessPhone, p.businessAddress].filter(Boolean).map(v => esc(v as string)).join(' &nbsp;&bull;&nbsp; ');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Your order is in!</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preview text shown in the inbox list -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your order is in! Tracking number ${tracking}. Tap to follow it live.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f1;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">

          <!-- Brand bar -->
          <tr>
            <td style="background:${BRAND};padding:16px 24px;">
              <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:0.2px;">${esc(p.businessName)}</span>
            </td>
          </tr>

          <!-- Hero with the chef pig -->
          <tr>
            <td align="center" style="background:${CREAM};padding:24px 24px 8px;">
              <img src="${esc(p.imageUrl)}" width="220" alt="Our chef pig giving a thumbs up"
                   style="display:block;width:220px;max-width:70%;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="background:${CREAM};padding:4px 28px 24px;">
              <div style="font-size:26px;line-height:1.25;font-weight:800;color:${BRAND};">
                Woohoo, ${firstName}! Your order is in &#127881;
              </div>
              <div style="font-size:15px;line-height:1.5;color:${INK};padding-top:8px;">
                Thanks for ordering. Our chef is already excited.<br />
                Keep this email: you can follow your order anytime.
              </div>
            </td>
          </tr>

          <!-- Tracking number card -->
          <tr>
            <td style="padding:24px 24px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="border:2px dashed ${BRAND};border-radius:16px;background:${BRAND_SOFT};">
                <tr>
                  <td align="center" style="padding:18px 16px 6px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND};">
                      Your tracking number
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:4px 12px 4px;">
                    <!-- No spaces inside the number, so copy-paste into the Track page works. -->
                    <div style="font-family:'Courier New',Consolas,monospace;font-size:16px;font-weight:700;color:${INK};letter-spacing:1px;word-break:break-all;">
                      ${tracking}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:2px 16px 16px;">
                    <div style="font-size:12px;color:${MUTED};">
                      Order <strong style="color:${INK};">${esc(p.orderCode)}</strong> &nbsp;&bull;&nbsp; ${esc(p.orderTypeLabel)} &nbsp;&bull;&nbsp; ${esc(p.placedAt)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Big Track button -->
          <tr>
            <td align="center" style="padding:16px 24px 6px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px;background:${BRAND};">
                    <a href="${esc(p.trackUrl)}" target="_blank"
                       style="display:inline-block;padding:15px 34px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;">
                      Track my order &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-size:12px;color:${MUTED};padding-top:10px;">
                Or open <a href="${esc(p.trackUrl)}" style="color:${BRAND};">${esc(p.trackUrl)}</a>
              </div>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding:22px 24px 4px;">
              <div style="font-size:16px;font-weight:800;color:${INK};padding-bottom:12px;">What happens next</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${stepRows}
              </table>
            </td>
          </tr>

          <!-- Order summary -->
          <tr>
            <td style="padding:12px 24px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#fafaf8;border:1px solid #eeeeea;border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px 4px;">
                    <div style="font-size:16px;font-weight:800;color:${INK};padding-bottom:4px;">Your order</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${itemRows}
                      <tr>
                        <td style="padding:12px 0 14px;font-size:15px;font-weight:800;color:${INK};">Total</td>
                        <td align="right" style="padding:12px 0 14px;font-size:17px;font-weight:800;color:${BRAND};white-space:nowrap;">${money(p.total)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Help -->
          <tr>
            <td style="padding:16px 24px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:${ACCENT};border-radius:14px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;line-height:1.5;color:#4a3a12;">
                    <strong>Keep your phone nearby</strong> so we can reach you to confirm your order.
                    Need help? Just reply to this email${p.businessPhone ? ` or call <strong>${esc(p.businessPhone)}</strong>` : ''}.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#f7f7f4;padding:18px 24px;border-top:1px solid #eeeeea;">
              <div style="font-size:13px;font-weight:700;color:${BRAND};">${esc(p.businessName)}</div>
              ${contactLine ? `<div style="font-size:12px;color:${MUTED};padding-top:4px;">${contactLine}</div>` : ''}
              <div style="font-size:11px;color:#9ca3af;padding-top:8px;">You received this because you placed an order with us.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Woohoo, ${p.customerName.split(' ')[0] || 'there'}! Your order is in.`,
    '',
    `Tracking number: ${p.trackingNumber}`,
    `Order ${p.orderCode} - ${p.orderTypeLabel} - ${p.placedAt}`,
    '',
    `Track your order: ${p.trackUrl}`,
    '',
    'Your order:',
    ...p.items.map(i => `- ${i.name} x ${i.quantity}: PHP ${i.lineTotal.toFixed(2)}`),
    `Total: PHP ${p.total.toFixed(2)}`,
    '',
    'What happens next: we call to confirm, you pay, we prepare, then pick-up or delivery.',
    `${p.businessName}${p.businessPhone ? ` - ${p.businessPhone}` : ''}`
  ].join('\n');

  return {html, text};
}
