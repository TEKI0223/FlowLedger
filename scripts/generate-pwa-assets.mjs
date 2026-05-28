import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const iconSpecs = [
  { path: "public/icons/icon-192.png", size: 192, maskable: false },
  { path: "public/icons/icon-512.png", size: 512, maskable: false },
  { path: "public/icons/icon-maskable-192.png", size: 192, maskable: true },
  { path: "public/icons/icon-maskable-512.png", size: 512, maskable: true },
  { path: "public/icons/apple-touch-icon.png", size: 180, maskable: false },
];

const splashSpecs = [
  {
    path: "public/splash/iphone-15.png",
    width: 1179,
    height: 2556,
  },
  {
    path: "public/splash/iphone-15-plus.png",
    width: 1290,
    height: 2796,
  },
  {
    path: "public/splash/iphone-14.png",
    width: 1170,
    height: 2532,
  },
  {
    path: "public/splash/iphone-13-mini.png",
    width: 1080,
    height: 2340,
  },
  {
    path: "public/splash/iphone-11-pro.png",
    width: 1125,
    height: 2436,
  },
  {
    path: "public/splash/iphone-11-pro-max.png",
    width: 1242,
    height: 2688,
  },
  {
    path: "public/splash/iphone-11.png",
    width: 828,
    height: 1792,
  },
  {
    path: "public/splash/iphone-8.png",
    width: 750,
    height: 1334,
  },
  {
    path: "public/splash/ipad-pro-11.png",
    width: 1668,
    height: 2388,
  },
  {
    path: "public/splash/ipad-pro-12-9.png",
    width: 2048,
    height: 2732,
  },
];

for (const spec of iconSpecs) {
  writePng(spec.path, drawIcon(spec.size, spec.maskable));
}

for (const spec of splashSpecs) {
  writePng(spec.path, drawSplash(spec.width, spec.height));
}

console.log(`Generated ${iconSpecs.length} icons and ${splashSpecs.length} splash images.`);

function writePng(path, image) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(image.width, image.height, image.data));
}

function drawIcon(size, maskable) {
  const data = new Uint8Array(size * size * 4);
  const padding = Math.round(size * (maskable ? 0.18 : 0.11));
  const outerRadius = Math.round(size * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (size * 2);
      const c = mixColor([15, 118, 110], [8, 66, 84], t);
      putPixel(data, size, x, y, c[0], c[1], c[2], 255);
    }
  }

  // Subtle lower band for depth.
  fillRoundedRect(
    data,
    size,
    padding,
    Math.round(size * 0.56),
    size - padding,
    size - padding,
    Math.round(size * 0.16),
    [5, 46, 56, 95],
  );

  const cardX = padding;
  const cardY = Math.round(size * (maskable ? 0.28 : 0.23));
  const cardW = size - padding * 2;
  const cardH = Math.round(size * 0.45);
  fillRoundedRect(
    data,
    size,
    cardX,
    cardY,
    cardX + cardW,
    cardY + cardH,
    outerRadius,
    [248, 250, 252, 250],
  );

  const stripeY = cardY + Math.round(cardH * 0.23);
  fillRoundedRect(
    data,
    size,
    cardX + Math.round(cardW * 0.13),
    stripeY,
    cardX + Math.round(cardW * 0.87),
    stripeY + Math.max(4, Math.round(size * 0.035)),
    Math.round(size * 0.02),
    [15, 118, 110, 230],
  );

  const lineColor = [20, 83, 45, 220];
  const lineH = Math.max(3, Math.round(size * 0.022));
  for (let i = 0; i < 3; i++) {
    const y = cardY + Math.round(cardH * (0.48 + i * 0.15));
    fillRoundedRect(
      data,
      size,
      cardX + Math.round(cardW * 0.17),
      y,
      cardX + Math.round(cardW * (i === 1 ? 0.74 : 0.64)),
      y + lineH,
      lineH,
      lineColor,
    );
  }

  const dotSize = Math.max(9, Math.round(size * 0.075));
  for (let i = 0; i < 3; i++) {
    const cx = cardX + Math.round(cardW * 0.82);
    const cy = cardY + Math.round(cardH * (0.49 + i * 0.15));
    fillCircle(data, size, cx, cy, dotSize / 2, [16, 185, 129, 235]);
  }

  return { width: size, height: size, data };
}

function drawSplash(width, height) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = y / height;
      const c = mixColor([255, 255, 255], [240, 253, 250], t);
      putPixel(data, width, x, y, c[0], c[1], c[2], 255);
    }
  }

  const iconSize = Math.round(Math.min(width, height) * 0.24);
  const icon = drawIcon(iconSize, false);
  blit(
    data,
    width,
    icon.data,
    icon.width,
    icon.height,
    Math.round((width - iconSize) / 2),
    Math.round(height * 0.38),
  );

  const barW = Math.round(iconSize * 0.72);
  const barH = Math.max(8, Math.round(iconSize * 0.035));
  const centerX = Math.round(width / 2);
  const startY = Math.round(height * 0.38 + iconSize + iconSize * 0.18);
  fillRoundedRect(
    data,
    width,
    centerX - barW / 2,
    startY,
    centerX + barW / 2,
    startY + barH,
    barH,
    [15, 118, 110, 210],
  );
  fillRoundedRect(
    data,
    width,
    centerX - barW * 0.34,
    startY + barH * 2.2,
    centerX + barW * 0.34,
    startY + barH * 3.2,
    barH,
    [20, 83, 45, 160],
  );

  return { width, height, data };
}

function putPixel(data, width, x, y, r, g, b, a) {
  const ix = (Math.floor(y) * width + Math.floor(x)) * 4;
  data[ix] = r;
  data[ix + 1] = g;
  data[ix + 2] = b;
  data[ix + 3] = a;
}

function blendPixel(data, width, x, y, color) {
  x = Math.floor(x);
  y = Math.floor(y);
  const ix = (y * width + x) * 4;
  const alpha = color[3] / 255;
  data[ix] = Math.round(color[0] * alpha + data[ix] * (1 - alpha));
  data[ix + 1] = Math.round(color[1] * alpha + data[ix + 1] * (1 - alpha));
  data[ix + 2] = Math.round(color[2] * alpha + data[ix + 2] * (1 - alpha));
  data[ix + 3] = 255;
}

function fillRoundedRect(data, width, left, top, right, bottom, radius, color) {
  left = Math.round(left);
  top = Math.round(top);
  right = Math.round(right);
  bottom = Math.round(bottom);
  radius = Math.round(radius);
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const dx = Math.max(left + radius - x, 0, x - (right - radius));
      const dy = Math.max(top + radius - y, 0, y - (bottom - radius));
      if (dx * dx + dy * dy <= radius * radius) blendPixel(data, width, x, y, color);
    }
  }
}

function fillCircle(data, width, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) blendPixel(data, width, x, y, color);
    }
  }
}

function blit(target, targetWidth, source, sourceWidth, sourceHeight, offsetX, offsetY) {
  for (let y = 0; y < sourceHeight; y++) {
    for (let x = 0; x < sourceWidth; x++) {
      const si = (y * sourceWidth + x) * 4;
      blendPixel(target, targetWidth, offsetX + x, offsetY + y, [
        source[si],
        source[si + 1],
        source[si + 2],
        source[si + 3],
      ]);
    }
  }
}

function mixColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([
    u32(data.length),
    typeBuffer,
    data,
    u32(crc32(Buffer.concat([typeBuffer, data]))),
  ]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
