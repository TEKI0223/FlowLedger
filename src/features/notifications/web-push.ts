import webPush, { type PushSubscription } from "web-push";
import { deletePushSubscriptionByEndpoint, listPushSubscriptionsForUser } from "./subscriptions";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushResult = {
  attempted: number;
  sent: number;
};

let configured = false;

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? "";
}

function configureWebPush() {
  if (configured) return;

  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Web Push VAPID keys are not configured.");
  }

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:flowledger@example.invalid",
    publicKey,
    privateKey,
  );
  configured = true;
}

export async function sendPushToUser(
  ownerUserId: string,
  payload: PushPayload,
): Promise<PushResult> {
  configureWebPush();

  const subscriptions = await listPushSubscriptionsForUser(ownerUserId);
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
        sent += 1;
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await deletePushSubscriptionByEndpoint(subscription.endpoint);
          return;
        }
        console.error("Failed to send push notification", error);
      }
    }),
  );

  return { attempted: subscriptions.length, sent };
}

function isExpiredSubscriptionError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}
