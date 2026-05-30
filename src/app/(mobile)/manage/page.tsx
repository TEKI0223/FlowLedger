import Link from "next/link";
import {
  ArrowRightIcon,
  CreditCardIcon,
  FolderTreeIcon,
  LayersIcon,
  LogOutIcon,
  MousePointerClickIcon,
  ReceiptIcon,
  RepeatIcon,
  SettingsIcon,
  WalletIcon,
  ZapIcon,
} from "lucide-react";
import { LogoutButton } from "@/app/logout-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

const manageItems = [
  {
    label: "账户管理",
    description: "账户余额、充值、消费和校准",
    href: "/accounts",
    icon: WalletIcon,
  },
  {
    label: "快捷模板",
    description: "维护日常快捷记账模板",
    href: "/templates",
    icon: ZapIcon,
  },
  {
    label: "交易分类",
    description: "管理分类层级和常用排序",
    href: "/categories",
    icon: FolderTreeIcon,
  },
  {
    label: "支付方式",
    description: "维护付款工具、默认账户和启用状态",
    href: "/manage/payment-methods",
    icon: MousePointerClickIcon,
  },
  {
    label: "周期项目",
    description: "管理固定收入、订阅和周期支出",
    href: "/recurring",
    icon: RepeatIcon,
  },
  {
    label: "信用卡",
    description: "查看信用卡账单和还款入口",
    href: "/credit-cards",
    icon: CreditCardIcon,
  },
  {
    label: "退款追踪",
    description: "跟踪待到账退款",
    href: "/refunds",
    icon: ReceiptIcon,
  },
  {
    label: "分期计划",
    description: "查看仍在执行的分期项目",
    href: "/installments",
    icon: LayersIcon,
  },
  {
    label: "汇率",
    description: "S2.3 接入手动汇率编辑",
    href: "/manage/rates",
    icon: SettingsIcon,
  },
  // 图像识别入口暂时隐藏（/manage/ocr 仍可直接访问，代码保留）。
  // {
  //   label: "图像识别",
  //   description: "选择拍照记账使用的 OCR provider",
  //   href: "/manage/ocr",
  //   icon: CameraIcon,
  // },
];

export default async function ManagePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">管理</h1>
      </header>

      <Card size="sm" className="divide-y divide-border py-0">
        {manageItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </Card>

      <section className="mt-4 flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <LogOutIcon className="size-4" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium">退出登录</h2>
            <p className="text-xs text-muted-foreground">当前用户：{user.name}</p>
          </div>
        </div>
        <LogoutButton />
      </section>
    </main>
  );
}
