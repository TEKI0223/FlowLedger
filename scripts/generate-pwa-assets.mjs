import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";

const regularIcon = "public/icons/app-icon.png";
const maskableIcon = "public/icons/app-icon-maskable.png";

const iconSpecs = [
  { path: "public/icons/icon-192.png", size: 192, source: regularIcon },
  { path: "public/icons/icon-512.png", size: 512, source: regularIcon },
  { path: "public/icons/icon-maskable-192.png", size: 192, source: maskableIcon },
  { path: "public/icons/icon-maskable-512.png", size: 512, source: maskableIcon },
  { path: "public/icons/apple-touch-icon.png", size: 180, source: regularIcon },
];

const splashSpecs = [
  { path: "public/splash/iphone-15.png", width: 1179, height: 2556 },
  { path: "public/splash/iphone-15-plus.png", width: 1290, height: 2796 },
  { path: "public/splash/iphone-14.png", width: 1170, height: 2532 },
  { path: "public/splash/iphone-13-mini.png", width: 1080, height: 2340 },
  { path: "public/splash/iphone-11-pro.png", width: 1125, height: 2436 },
  { path: "public/splash/iphone-11-pro-max.png", width: 1242, height: 2688 },
  { path: "public/splash/iphone-11.png", width: 828, height: 1792 },
  { path: "public/splash/iphone-8.png", width: 750, height: 1334 },
  { path: "public/splash/ipad-pro-11.png", width: 1668, height: 2388 },
  { path: "public/splash/ipad-pro-12-9.png", width: 2048, height: 2732 },
];

for (const spec of iconSpecs) {
  await writeIcon(spec);
}

for (const spec of splashSpecs) {
  await writeSplash(spec);
}

console.log(`Generated ${iconSpecs.length} icons and ${splashSpecs.length} splash images.`);

async function writeIcon({ path, size, source }) {
  mkdirSync(dirname(path), { recursive: true });
  await sharp(source).resize(size, size, { fit: "contain" }).png().toFile(path);
}

async function writeSplash({ path, width, height }) {
  mkdirSync(dirname(path), { recursive: true });

  const iconSize = Math.round(Math.min(width, height) * 0.24);
  const icon = await sharp(regularIcon)
    .resize(iconSize, iconSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: icon,
        left: Math.round((width - iconSize) / 2),
        top: Math.round(height * 0.38),
      },
    ])
    .png()
    .toFile(path);
}
