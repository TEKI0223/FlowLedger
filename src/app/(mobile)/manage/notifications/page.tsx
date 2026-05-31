import { BellIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettings } from "./notification-settings";

export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <BellIcon className="size-6 text-muted-foreground" />
          通知提醒
        </h1>
        <p className="text-sm text-muted-foreground">
          每天检查待办；新待办首次出现和到期当天各提醒一次。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>手机推送</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>
    </main>
  );
}
