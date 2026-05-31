import { getVapidPublicKey } from "@/features/notifications/web-push";

export function GET() {
  const publicKey = getVapidPublicKey();
  return Response.json({
    configured: Boolean(publicKey),
    publicKey,
  });
}
