"use client";

import { useCallback, useEffect, useState } from "react";
import { BellIcon, BellOffIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";

type Status = "checking" | "unsupported" | "ready" | "enabled";

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    setError(null);

    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }

    setPermission(Notification.permission);
    const keyResponse = await fetch("/api/push/public-key");
    const keyData = (await keyResponse.json()) as { publicKey?: string; configured?: boolean };
    if (!keyData.configured || !keyData.publicKey) {
      setStatus("ready");
      setPublicKey("");
      setError("还没有配置 VAPID 公钥和私钥，暂时不能开启推送。");
      return;
    }

    setPublicKey(keyData.publicKey);
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();
    setStatus(subscription ? "enabled" : "ready");
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => refreshStatus());
  }, [refreshStatus]);

  async function enableNotifications() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }
      if (!publicKey) {
        throw new Error("推送密钥尚未配置。");
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        throw new Error("通知权限没有开启。");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      setStatus("enabled");
      setMessage("已开启本设备推送提醒。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "开启推送失败。");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setStatus("ready");
      setMessage("已关闭本设备推送提醒。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "关闭推送失败。");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestNotification() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setMessage("测试通知已发送。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送测试通知失败。");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") {
    return <p className="text-sm text-muted-foreground">正在检查当前设备支持情况...</p>;
  }

  if (status === "unsupported") {
    return (
      <InlineAlert tone="danger" className="mb-0">
        当前浏览器不支持 PWA 推送。iPhone 需要 iOS 16.4+，并从主屏幕上的 FlowLedger 图标打开。
      </InlineAlert>
    );
  }

  return (
    <div className="space-y-4">
      {message ? <InlineAlert className="mb-0">{message}</InlineAlert> : null}
      {error ? (
        <InlineAlert tone="danger" className="mb-0">
          {error}
        </InlineAlert>
      ) : null}

      <div className="rounded-lg border border-border px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">本设备状态</span>
          <span className="font-medium">
            {status === "enabled" ? "已开启" : permission === "denied" ? "权限被拒绝" : "未开启"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "enabled" ? (
          <>
            <Button type="button" onClick={sendTestNotification} disabled={busy}>
              <SendIcon className="size-4" />
              发送测试
            </Button>
            <Button type="button" variant="outline" onClick={disableNotifications} disabled={busy}>
              <BellOffIcon className="size-4" />
              关闭本设备
            </Button>
          </>
        ) : (
          <Button type="button" onClick={enableNotifications} disabled={busy || !publicKey}>
            <BellIcon className="size-4" />
            开启提醒
          </Button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        推送只会在每天定时检查后发送：新待办第一次出现提醒一次，到期当天再提醒一次。
      </p>
    </div>
  );
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
