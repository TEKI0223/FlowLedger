import { sendDailyRemindersForAllUsers } from "@/features/notifications/reminders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const results = await sendDailyRemindersForAllUsers();
    return Response.json({ ok: true, results });
  } catch (error) {
    console.error("Failed to send daily reminders", error);
    return new Response(error instanceof Error ? error.message : "发送每日提醒失败", {
      status: 500,
    });
  }
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
