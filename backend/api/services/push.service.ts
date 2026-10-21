import mongoose from 'mongoose';
import webpush from 'web-push';
import {env} from '../config/env';
import {PushSubscriptionModel} from '../models/PushSubscription.model';
import {ApiError} from '../utils/error';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:donclaudios@example.com',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  }
}

export const pushService = {
  async subscribe(input: {
    endpoint: string;
    keys: {p256dh: string; auth: string};
    userId?: string | null;
    userType?: 'customer' | 'admin' | 'cashier' | null;
  }) {
    ensureVapid();
    const existing = await PushSubscriptionModel.findOne({endpoint: input.endpoint});
    if (existing) {
      existing.keys = input.keys;
      existing.userId = input.userId ? new mongoose.Types.ObjectId(input.userId) : existing.userId;
      existing.userType = input.userType ?? existing.userType;
      await existing.save();
      return existing;
    }
    return PushSubscriptionModel.create({
      endpoint: input.endpoint,
      keys: input.keys,
      userId: input.userId || null,
      userType: input.userType || null
    });
  },

  async unsubscribe(endpoint?: string) {
    if (!endpoint) return {deleted: 0};
    const res = await PushSubscriptionModel.deleteOne({endpoint});
    return {deleted: res.deletedCount};
  },

  async sendToEndpoint(sub: {endpoint: string; keys: {p256dh: string; auth: string}}, payload: {title: string; body: string; icon?: string; url?: string}) {
    ensureVapid();
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      throw new ApiError(500, 'VAPID_NOT_CONFIGURED', 'VAPID keys not configured');
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys
        } as webpush.PushSubscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          url: payload.url || '/'
        })
      );
      return {success: true};
    } catch (error: unknown) {
      const statusCode = (error as {statusCode?: number})?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await PushSubscriptionModel.deleteOne({endpoint: sub.endpoint});
      }
      return {success: false, error: String(error)};
    }
  },

  async sendToUser(userId: string, userType: string, payload: {title: string; body: string; icon?: string; url?: string}) {
    const subs = await PushSubscriptionModel.find({userId, userType});
    const results = await Promise.all(subs.map((s) => this.sendToEndpoint(s, payload)));
    return results;
  },

  async sendToAll(payload: {title: string; body: string; icon?: string; url?: string}) {
    const subs = await PushSubscriptionModel.find({});
    const results = await Promise.all(subs.map((s) => this.sendToEndpoint(s, payload)));
    return results;
  },

  async list() {
    return PushSubscriptionModel.find({}).select('endpoint userType userId createdAt');
  }
};
