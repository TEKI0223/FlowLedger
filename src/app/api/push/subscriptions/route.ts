import { z } from "zod";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/features/notifications/subscriptions";
import { getCurrentUserId } from "@/lib/auth";

const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const ownerUserId = await getCurrentUserId();
    const parsed = pushSubscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return new Response("推送订阅格式不正确", { status: 400 });
    }

    await savePushSubscription(
      ownerUserId,
      parsed.data.subscription,
      request.headers.get("user-agent"),
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to save push subscription", error);
    return new Response("保存推送订阅失败", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ownerUserId = await getCurrentUserId();
    const parsed = deleteSubscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return new Response("推送订阅格式不正确", { status: 400 });
    }

    await deletePushSubscription(ownerUserId, parsed.data.endpoint);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete push subscription", error);
    return new Response("删除推送订阅失败", { status: 500 });
  }
}
