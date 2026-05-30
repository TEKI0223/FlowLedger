import { getCurrentOcrProviderId } from "@/app/actions/ocr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isProviderKeyConfigured,
  ocrProviderIds,
  ocrProviderRegistry,
} from "@/lib/ocr";
import { OcrSettingsForm } from "./ocr-settings-form";

export const dynamic = "force-dynamic";

export default async function ManageOcrPage() {
  const currentProviderId = await getCurrentOcrProviderId();

  const providers = ocrProviderIds.map((id) => {
    const meta = ocrProviderRegistry[id];
    return { ...meta, keyConfigured: isProviderKeyConfigured(meta) };
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">图像识别</h1>
          <p className="text-sm text-muted-foreground">
            选择拍照记账时使用的 OCR 后端。API key 在 .env 中配置，未配置 key 的 provider 无法选择。
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>当前 provider</CardTitle>
          <CardDescription>
            未配置 key 时会自动降级到 Mock。新加 provider 只需要修改 src/lib/ocr/registry.ts。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OcrSettingsForm currentProviderId={currentProviderId} providers={providers} />
        </CardContent>
      </Card>
    </main>
  );
}
