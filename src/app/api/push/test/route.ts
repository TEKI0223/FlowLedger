import { sendPushToUser } from "@/features/notifications/web-push";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    const ownerUserId = await getCurrentUserId();
    const result = await sendPushToUser(ownerUserId, {
      title: "FlowLedger 推送已开启",
      body: "这是一条测试通知。之后只有出现待办提醒时才会推送。",
      url: "/",
      tag: "flowledger-test",
    });

    if (result.attempted === 0) {
      return new Response("当前用户还没有已保存的推送设备", { status: 400 });
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Failed to send test push", error);
    return new Response(error instanceof Error ? error.message : "发送测试通知失败", {
      status: 500,
    });
  }
}
