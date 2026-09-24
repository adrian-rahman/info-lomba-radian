import webpush from 'web-push';

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY || 'BKrD7LQWzaT-e8oxH8QoSZvUU-XJyCrIpL4sPz8yikh8laRilI5oOpEATKCh5Ot_tIAeImmjRSA_d1UgxxOAYX8';
export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '8vZy_1lfoaWiJjVN_90Rxkn_cRA7YQoPwjSlPbNEivY';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@matek-ambis.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function sendWebPush(subscription, payload) {
  try {
    const pushSub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh || subscription.keys?.p256dh,
        auth: subscription.auth || subscription.keys?.auth
      }
    };
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    return { ok: false, statusCode: error.statusCode, message: error.message };
  }
}
