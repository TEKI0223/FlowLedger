const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_QUALITY = 0.85;
const OUTPUT_MIME_TYPE = "image/jpeg";

export type CompressedImage = {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  byteLength: number;
};

export async function compressImageForOcr(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  // iPhone 默认拍 HEIC（含 HDR / 10-bit 变体），多数桌面浏览器不支持解码。
  // 用 heic-to（基于较新的 libheif WASM）转出 ImageBitmap。库只在真碰到 HEIC 时动态加载。
  const bitmap = isHeic(file) ? await decodeHeicToBitmap(file) : await loadBitmap(file);
  const { width, height } = scaleDownToFit(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("当前浏览器不支持 canvas 2D");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_MIME_TYPE, quality);
  });
  if (!blob) {
    throw new Error("图片压缩失败");
  }

  const base64 = await blobToBase64(blob);
  return {
    base64,
    mimeType: OUTPUT_MIME_TYPE,
    width,
    height,
    byteLength: blob.size,
  };
}

function isHeic(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const lowerType = file.type.toLowerCase();
  return (
    lowerType === "image/heic" ||
    lowerType === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  );
}

async function decodeHeicToBitmap(file: File): Promise<ImageBitmap> {
  let heicTo: typeof import("heic-to").heicTo;
  try {
    heicTo = (await import("heic-to")).heicTo;
  } catch (error) {
    console.error("[image] heic-to module load failed", error);
    throw new Error(`加载 HEIC 转换库失败：${describeError(error)}`);
  }

  try {
    return await heicTo({ blob: file, type: "bitmap" });
  } catch (error) {
    console.error("[image] heic-to conversion failed", error);
    const detail = describeError(error);
    throw new Error(
      `HEIC 解码失败（${detail}）。建议在 iPhone 上「分享 → 副本另存为 JPEG」后再上传，或在系统「设置 → 相机 → 格式」改为「兼容性最高」。`,
    );
  }
}

/** libheif 抛的常常是 { code, message } 普通对象，不是 Error 实例。 */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; message?: unknown };
    const parts: string[] = [];
    if (record.code !== undefined) parts.push(`code=${String(record.code)}`);
    if (typeof record.message === "string") parts.push(record.message);
    if (parts.length > 0) return parts.join(" ");
    try {
      return JSON.stringify(error);
    } catch {
      return "未知错误对象";
    }
  }
  return String(error);
}

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    return await loadBitmapViaImage(file);
  }
}

function loadBitmapViaImage(file: Blob): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        const bitmap = await createImageBitmap(img);
        URL.revokeObjectURL(url);
        resolve(bitmap);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法解码图片，请使用 JPEG / PNG / WebP / HEIC 格式"));
    };
    img.src = url;
  });
}

function scaleDownToFit(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader returned non-string"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}
