type NewsletterEmailParams = {
  appName?: string;
  recipientName?: string;
  title: string;
  lines: string[];
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Newsletter email (new product, promo, pre-order date). Only sent to
 * customers who opted in; every email carries a one-click unsubscribe link.
 */
export function newsletterEmailTemplate({
  appName = "DonClaudio's Lechon House",
  recipientName,
  title,
  lines,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl
}: NewsletterEmailParams) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : 'Hi,';
  const why = `You're getting this because you subscribed to ${appName} news.`;

  const text = `${greeting}\n\n${lines.join('\n\n')}\n\n${ctaLabel}: ${ctaUrl}\n\nThe ${appName} Team\n\n${why}\nUnsubscribe: ${unsubscribeUrl}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e7eaf2;">
        <div style="font-size:18px;font-weight:700;color:#2d4a35;">${escapeHtml(title)}</div>
        <div style="margin-top:12px;font-size:14px;color:#374151;line-height:1.5;">${escapeHtml(greeting)}</div>
        ${lines
          .map(
            l =>
              `<div style="margin-top:10px;font-size:14px;color:#374151;line-height:1.5;">${escapeHtml(l)}</div>`
          )
          .join('\n        ')}
        <div style="margin-top:18px;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#3c5e45;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:10px 18px;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
        </div>
        <div style="margin-top:18px;font-size:14px;color:#374151;">The ${escapeHtml(appName)} Team</div>
      </div>
      <div style="margin-top:14px;font-size:12px;color:#6b7280;line-height:1.5;text-align:center;">
        ${escapeHtml(why)}<br />
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`;

  return {subject: title, text, html};
}
