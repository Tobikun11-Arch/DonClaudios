import nodemailer from 'nodemailer';
import {env} from '../config/env';
import {ApiError} from '../utils/error';

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
};

function getSmtpConfig() {
  const host = env.SMTP_HOST;
  const portRaw = env.SMTP_PORT;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new ApiError(
      500,
      'SMTP_NOT_CONFIGURED',
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in environment variables.'
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new ApiError(
      500,
      'SMTP_BAD_PORT',
      'SMTP_PORT must be a valid number'
    );
  }

  return {host, port, user, pass, from};
}

export const emailService = {
  /**
   * One pooled SMTP connection set for a batch of emails (the newsletter), so
   * a send to many customers doesn't open a new connection per email.
   * Call close() when the batch is done.
   */
  createPooledSender() {
    const {host, port, user, pass, from} = getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {user, pass},
      pool: true,
      maxConnections: 3
    });
    return {
      send: async (params: SendEmailParams) => {
        await transporter.sendMail({from, ...params});
      },
      close: () => transporter.close()
    };
  },

  async sendEmail({to, subject, text, html}: SendEmailParams) {
    const {host, port, user, pass, from} = getSmtpConfig();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
  }
};
