type AccountNoticeEmailParams = {
  appName?: string;
  recipientName?: string;
  kind:
    | 'password_changed'
    | 'account_deleted'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'google_linked'
    | 'google_unlinked';
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Security notices sent after a sensitive account change, so the owner of the
 * mailbox hears about it even if someone else made the change.
 */
export function accountNoticeEmailTemplate({
  appName = 'DonClaudios',
  recipientName,
  kind
}: AccountNoticeEmailParams) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : 'Hi,';
  const when = new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const notIt =
    'If you did not make this change, reset your password right away using "Forgot password" on the sign-in page, and contact the store.';
  const notices: Record<AccountNoticeEmailParams['kind'], {title: string; lines: string[]}> = {
    password_changed: {
      title: `Your ${appName} password was changed`,
      lines: [
        `The password for your ${appName} account was changed on ${when} (Philippine time).`,
        'For your security, every other device signed in to your account has been signed out.',
        notIt
      ]
    },
    account_deleted: {
      title: `Your ${appName} account was deleted`,
      lines: [
        `Your ${appName} account was deleted on ${when} (Philippine time), as you requested.`,
        'Your profile, saved addresses, occasions, preferences, cart, notifications and reward points have been removed. Past orders are kept only as anonymous sales records, as required for the store’s accounting.',
        'If you did not request this, please contact the store right away.'
      ]
    },
    mfa_enabled: {
      title: `Two-step verification is on for your ${appName} account`,
      lines: [
        `Two-step verification was turned on on ${when} (Philippine time). From now on, signing in also needs a second code, from your email or your authenticator app.`,
        'Keep your backup codes somewhere safe. Each one works once if you cannot get the email.',
        notIt
      ]
    },
    mfa_disabled: {
      title: `Two-step verification is off for your ${appName} account`,
      lines: [
        `Two-step verification was turned off on ${when} (Philippine time). Signing in now needs only your password or Google account.`,
        notIt
      ]
    },
    google_linked: {
      title: `Google sign-in was linked to your ${appName} account`,
      lines: [
        `A Google account was linked on ${when} (Philippine time). You can now use "Continue with Google" to sign in.`,
        notIt
      ]
    },
    google_unlinked: {
      title: `Google sign-in was removed from your ${appName} account`,
      lines: [
        `Google sign-in was unlinked on ${when} (Philippine time). Sign in with your email and password from now on.`,
        notIt
      ]
    }
  };
  const {title, lines} = notices[kind];

  const text = `${greeting}\n\n${lines.join('\n\n')}\n\nThe ${appName} Team`;

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
        <div style="margin-top:18px;font-size:14px;color:#374151;">The ${escapeHtml(appName)} Team</div>
      </div>
    </div>
  </body>
</html>`;

  return {subject: title, text, html};
}
