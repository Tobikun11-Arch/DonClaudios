import crypto from 'crypto';
import mongoose from 'mongoose';
import {env} from '../config/env';
import {CustomerModel} from '../models/Customer.model';
import {ProductModel, type ProductDocument} from '../models/Product.model';
import {PromoModel, type PromoDocument} from '../models/Promo.model';
import {PreOrderEventModel, type PreOrderEventDocument} from '../models/PreOrderEvent.model';
import {isPromoCategory} from '../config/promoDates';
import {isPreOrderClosed} from '../config/preOrder';
import {newsletterEmailTemplate} from '../templates/newsletterEmail';
import {emailService} from './email.service';
import {ApiError} from '../utils/error';

/*
 * Newsletter: emails opted-in, verified customers when a product, promo or
 * pre-order date goes live. Every send runs in the background (the owner's
 * save never waits on it) and is claimed once with an atomic
 * `newsletterSentAt` update, so edits and double clicks never re-send.
 */

/** Emails in flight at once. Small on purpose: Gmail SMTP throttles bursts. */
const CONCURRENCY = 5;

type Announcement = {
  title: string;
  lines: string[];
  ctaLabel: string;
  /** Site path the button opens, e.g. "/order". */
  path: string;
};

function siteUrl() {
  return (env.FRONTEND_URL || 'https://www.donclaudios.com').replace(/\/+$/, '');
}

// --- unsubscribe token ---------------------------------------------------------

function signature(customerId: string) {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`newsletter-unsubscribe:${customerId}`)
    .digest('base64url');
}

/** `<customerId>.<hmac>`: lets the link unsubscribe without signing in. */
export function unsubscribeToken(customerId: string) {
  return `${customerId}.${signature(customerId)}`;
}

function customerIdFromToken(token: string): string | null {
  const [id, sig] = token.split('.');
  if (!id || !sig || !mongoose.Types.ObjectId.isValid(id)) return null;
  const expected = Buffer.from(signature(id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return id;
}

// --- sending -------------------------------------------------------------------

async function sendToSubscribers(a: Announcement) {
  const customers = await CustomerModel.find({newsletterOptIn: true, isVerified: true})
    .select('_id email firstName')
    .lean()
    .exec();
  if (customers.length === 0) return;

  const site = siteUrl();
  const sender = emailService.createPooledSender();
  let sent = 0;
  let failed = 0;
  try {
    for (let i = 0; i < customers.length; i += CONCURRENCY) {
      await Promise.all(
        customers.slice(i, i + CONCURRENCY).map(async c => {
          if (!c.email) return;
          const unsubscribeUrl = `${site}/newsletter/unsubscribe?token=${encodeURIComponent(
            unsubscribeToken(String(c._id))
          )}`;
          const tpl = newsletterEmailTemplate({
            recipientName: c.firstName,
            title: a.title,
            lines: a.lines,
            ctaLabel: a.ctaLabel,
            ctaUrl: `${site}${a.path}`,
            unsubscribeUrl
          });
          try {
            // One email per customer: addresses are never shared in To/CC.
            await sender.send({
              to: c.email,
              subject: tpl.subject,
              text: tpl.text,
              html: tpl.html,
              headers: {'List-Unsubscribe': `<${unsubscribeUrl}>`}
            });
            sent++;
          } catch {
            failed++;
          }
        })
      );
    }
  } finally {
    sender.close();
  }
  console.log(`Newsletter "${a.title}": sent ${sent}, failed ${failed}`);
}

/** Run in the background; a failed newsletter never fails the owner's save. */
function inBackground(label: string, work: () => Promise<void>) {
  const task = work().catch(error => console.error(`Newsletter (${label}) failed`, error));
  // On Vercel the function can freeze once the response is sent; waitUntil
  // keeps it alive until the sends finish (what @vercel/functions does, no
  // extra dependency). Locally there is no context and the promise just runs.
  const vercel = (globalThis as Record<symbol, unknown>)[Symbol.for('@vercel/request-context')] as
    | {get?: () => {waitUntil?: (p: Promise<unknown>) => void} | undefined}
    | undefined;
  vercel?.get?.()?.waitUntil?.(task);
}

const peso = (n: number) => `₱${n.toLocaleString('en-PH', {maximumFractionDigits: 2})}`;
const day = (d: Date) =>
  d.toLocaleDateString('en-PH', {timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'});

// --- products --------------------------------------------------------------------

/** Customers can see this product now (not hidden, promo not over, pre-order open). */
function isProductVisible(p: ProductDocument, now = new Date()) {
  if (p.isAvailable === false) return false;
  if (p.preOrderOnly && !p.isPreOrder) return false;
  if (p.isPreOrder && isPreOrderClosed(p.preOrderDeadline, now)) return false;
  if (isPromoCategory(p.category)) {
    if (p.isPromoActive === false) return false;
    if (p.promoEndDate && p.promoEndDate.getTime() < now.getTime()) return false;
  }
  return true;
}

function productAnnouncement(p: ProductDocument): Announcement {
  if (p.isPreOrder) {
    return {
      title: `Pre-order now open: ${p.name}`,
      lines: [
        `${p.name} is now open for pre-order${p.preOrderDeadline ? ` until ${day(p.preOrderDeadline)}` : ''}.`,
        'Slots are limited, so reserve yours early.'
      ],
      ctaLabel: 'Pre-order now',
      path: `/order/${String(p._id)}`
    };
  }
  if (isPromoCategory(p.category)) {
    const dates =
      p.promoStartDate && p.promoEndDate
        ? ` Available ${day(p.promoStartDate)} to ${day(p.promoEndDate)}.`
        : p.promoEndDate
          ? ` Available until ${day(p.promoEndDate)}.`
          : '';
    return {
      title: `New promo: ${p.name}`,
      lines: [`Our new promo ${p.name} is here for ${peso(p.price)}.${dates}`, p.description ?? ''].filter(Boolean),
      ctaLabel: 'See the promo',
      path: `/order/promo/${String(p._id)}`
    };
  }
  return {
    title: `New on the menu: ${p.name}`,
    lines: [`Say hello to ${p.name}, now on our menu for ${peso(p.price)}.`, p.description ?? ''].filter(Boolean),
    ctaLabel: 'Order now',
    path: `/order/${String(p._id)}`
  };
}

// --- promos ----------------------------------------------------------------------

function promoAnnouncement(p: PromoDocument): Announcement {
  return {
    title: `New promo: ${p.title}`,
    lines: [
      `${p.title} runs ${day(p.startDate)} to ${day(p.endDate)}.`,
      p.description ?? ''
    ].filter(Boolean),
    ctaLabel: 'See the menu',
    path: '/order'
  };
}

// --- public API ------------------------------------------------------------------

export const newsletterService = {
  /**
   * Email subscribers about a product once it is visible to customers.
   * `newsletterSentAt: null` marks a product made after the newsletter
   * existed; older products (field missing) only qualify when a pre-order
   * was just switched on.
   */
  announceProduct(product: ProductDocument, opts: {preOrderJustOpened?: boolean} = {}) {
    if (!isProductVisible(product)) return;
    inBackground(`product ${product.name}`, async () => {
      const notSent = opts.preOrderJustOpened ? null : {$type: 'null' as const};
      const claim = await ProductModel.updateOne(
        {_id: product._id, newsletterSentAt: notSent},
        {$set: {newsletterSentAt: new Date()}}
      ).exec();
      if (claim.modifiedCount === 0) return;
      await sendToSubscribers(productAnnouncement(product));
    });
  },

  /** Email subscribers about an active promo that hasn't ended (once). */
  announcePromo(promo: PromoDocument) {
    if (!promo.isActive || promo.endDate.getTime() < Date.now()) return;
    inBackground(`promo ${promo.title}`, async () => {
      const claim = await PromoModel.updateOne(
        {_id: promo._id, newsletterSentAt: {$type: 'null'}},
        {$set: {newsletterSentAt: new Date()}}
      ).exec();
      if (claim.modifiedCount === 0) return;
      await sendToSubscribers(promoAnnouncement(promo));
    });
  },

  /** Email subscribers when a pre-order date is first published (once). */
  announcePreOrderDate(event: PreOrderEventDocument, pickupLabel: string) {
    if (event.status !== 'published') return;
    // Pickup day already over: nothing to order.
    if (event.pickupDate.getTime() + 24 * 60 * 60 * 1000 < Date.now()) return;
    inBackground(`pre-order ${event.title}`, async () => {
      const claim = await PreOrderEventModel.updateOne(
        {_id: event._id, newsletterSentAt: null},
        {$set: {newsletterSentAt: new Date()}}
      ).exec();
      if (claim.modifiedCount === 0) return;
      await sendToSubscribers({
        title: `Pre-order is open: ${event.title}`,
        lines: [
          `Reserve your lechon for pickup on ${pickupLabel}.`,
          event.description ?? '',
          'Slots are limited, so order early.'
        ].filter(Boolean),
        ctaLabel: 'Reserve now',
        path: `/customer/dashboard/preorder/${String(event._id)}`
      });
    });
  },

  /** One-click unsubscribe from an email link (no sign-in needed). */
  async unsubscribe(token: string) {
    const id = customerIdFromToken(token);
    if (!id) throw new ApiError(400, 'INVALID_TOKEN', 'This unsubscribe link is invalid.');
    await CustomerModel.updateOne(
      {_id: id, newsletterOptIn: true},
      {$set: {newsletterOptIn: false, newsletterOptInAt: new Date()}}
    ).exec();
    return {unsubscribed: true};
  },

  /** Signed-in customer turns the newsletter on or off. */
  async setOptIn(customerId: string, optIn: boolean) {
    const res = await CustomerModel.updateOne(
      {_id: customerId},
      {$set: {newsletterOptIn: optIn, newsletterOptInAt: new Date()}}
    ).exec();
    if (res.matchedCount === 0) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    return {newsletterOptIn: optIn};
  }
};
