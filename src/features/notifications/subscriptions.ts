import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";
import { nowIso } from "@/lib/dates";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type StoredPushSubscription = typeof pushSubscriptions.$inferSelect;

export async function savePushSubscription(
  ownerUserId: string,
  subscription: PushSubscriptionInput,
  userAgent: string | null,
) {
  const now = nowIso();
  const id = crypto.randomUUID();

  await db
    .insert(pushSubscriptions)
    .values({
      id,
      ownerUserId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        ownerUserId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        updatedAt: now,
        lastSeenAt: now,
      },
    });
}

export async function deletePushSubscription(ownerUserId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.ownerUserId, ownerUserId), eq(pushSubscriptions.endpoint, endpoint)),
    );
}

export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listPushSubscriptionsForUser(
  ownerUserId: string,
): Promise<StoredPushSubscription[]> {
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.ownerUserId, ownerUserId));
}
