type ReviewReplyEmailParams = {
  appName?: string;
  recipientName?: string;
  reply: string;
};

export function reviewReplyEmailTemplate({
  appName = 'DonClaudios',
  recipientName,
  reply
}: ReviewReplyEmailParams) {
  const safeRecipient = recipientName?.trim();
  const title = `${appName} replied to your review`;

  const text =
    `${safeRecipient ? `Hi ${safeRecipient},` : 'Hi,'}\n\n` +
    `Thank you for leaving a review with ${appName}. We appreciate your feedback!\n\n` +
    `Here is what the ${appName} team had to say in response to your review:\n\n` +
    `"${reply}"\n\n` +
    `If you have any further questions, feel free to reach out to us anytime.\n\n` +
    `Thanks for your support,\n` +
    `The ${appName} Team`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e7eaf2;">
        <div style="font-size:18px;font-weight:700;color:#111827;">${appName}</div>
        <div style="margin-top:12px;font-size:14px;color:#374151;line-height:1.5;">
          ${safeRecipient ? `Hi ${safeRecipient},` : 'Hi,'}
        </div>
        <div style="margin-top:10px;font-size:14px;color:#374151;line-height:1.5;">
          Thank you for leaving a review with ${appName}. We appreciate your feedback!
        </div>

        <div style="margin:18px 0;padding:18px;border-radius:12px;background:#f9fafb;border:1px solid #e7eaf2;">
          <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
            Response from the ${appName} team
          </div>
          <div style="margin-top:8px;font-size:14px;color:#111827;line-height:1.6;">&ldquo;${reply}&rdquo;</div>
        </div>

        <div style="font-size:13px;color:#6b7280;line-height:1.5;">
          If you have any further questions, feel free to reach out to us anytime.
        </div>

        <div style="margin-top:14px;font-size:13px;color:#6b7280;line-height:1.5;">
          Thanks for your support,<br />
          The ${appName} Team
        </div>
      </div>
      <div style="margin-top:14px;text-align:center;font-size:12px;color:#9ca3af;">
        © ${new Date().getFullYear()} ${appName}
      </div>
    </div>
  </body>
</html>`;

  return {subject: title, text, html};
}
