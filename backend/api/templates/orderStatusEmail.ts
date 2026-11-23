/**
 * Short "your order changed" email (ready for pick-up, on the way, ready for
 * your courier, cancelled). Same table + inline-style approach as
 * orderTrackingEmail so it renders in Gmail, Outlook and phone mail apps.
 */

export type OrderStatusEmailParams = {
  customerName: string;
  orderCode: string;
  headline: string;
  message: string;
  /** Extra line, e.g. the store address for pick-ups or the cancel reason. */
  detail?: string | null;
  items: Array<{name: string; quantity: number}>;
  trackUrl: string;
  businessName: string;
  businessPhone?: string;
};

const BRAND = '#2d4a35';
const INK = '#1f2937';
const MUTED = '#6b7280';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function orderStatusEmailTemplate(p: OrderStatusEmailParams): {html: string; text: string} {
  const firstName = esc(p.customerName.split(' ')[0] || 'there');
  const itemsList = p.items
    .map(i => `<li style="margin:2px 0;">${esc(i.name)} &times; ${i.quantity}</li>`)
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${esc(p.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(p.message)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f1;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND};padding:20px 24px;color:#ffffff;">
              <div style="font-size:13px;opacity:.85;">Order ${esc(p.orderCode)}</div>
              <div style="font-size:22px;font-weight:800;margin-top:4px;">${esc(p.headline)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:${INK};font-size:15px;line-height:1.55;">
              <p style="margin:0 0 12px;">Hi ${firstName},</p>
              <p style="margin:0 0 12px;">${esc(p.message)}</p>
              ${p.detail ? `<p style="margin:0 0 12px;color:${MUTED};font-size:14px;">${esc(p.detail)}</p>` : ''}
              ${itemsList ? `<ul style="margin:0 0 20px;padding-left:18px;color:${MUTED};font-size:14px;">${itemsList}</ul>` : ''}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:10px;background:${BRAND};">
                    <a href="${esc(p.trackUrl)}"
                       style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Track your order
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #f1f1f1;color:${MUTED};font-size:12px;">
              ${esc(p.businessName)}${p.businessPhone ? ` &nbsp;&bull;&nbsp; ${esc(p.businessPhone)}` : ''}<br />
              You get these emails for order updates. Turn them off in your profile under Notifications.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${p.customerName.split(' ')[0] || 'there'},`,
    '',
    `${p.headline} (order ${p.orderCode})`,
    p.message,
    p.detail ?? '',
    '',
    ...p.items.map(i => `- ${i.name} x ${i.quantity}`),
    '',
    `Track your order: ${p.trackUrl}`,
    '',
    p.businessName
  ]
    .filter(line => line !== undefined)
    .join('\n');

  return {html, text};
}
