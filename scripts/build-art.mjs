// Hoạ tiết thổ cẩm (SVG lặp) và hạt giấy cho nền kem. Tranh núi đồi nằm ở scripts/build-scenery.mjs.
// Chạy: node scripts/build-art.mjs → public/media/art/*
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = "public/media/art";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Đường sống núi: các đỉnh Gauss + nhiễu nhỏ. */

/** Ô hoạ tiết hình thoi lồng nhau. */
function diamondTile(color, opacity) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.2"><path d="M28 2 54 28 28 54 2 28Z"/><path d="M28 12 44 28 28 44 12 28Z"/><path d="M28 21 35 28 28 35 21 28Z"/><path d="M28 2v8M28 46v8M2 28h8M46 28h8"/></g></svg>`;
}

await fs.mkdir(OUT, { recursive: true });
const files = {
  "pattern-gold.svg": diamondTile("#c28c38", 0.55),
  "pattern-light.svg": diamondTile("#fff1dc", 0.35),
  "pattern-sand.svg": diamondTile("#b8915c", 0.32),
};
for (const [name, svg] of Object.entries(files)) {
  await fs.writeFile(path.join(OUT, name), svg);
  console.log(`${name.padEnd(22)} ${(svg.length / 1024).toFixed(1)} KB`);
}

// Hạt giấy mịn (lặp) cho nền kem.
const size = 220;
const noise = Buffer.alloc(size * size * 4);
const random = rng(99);
for (let i = 0; i < size * size; i++) {
  const value = 120 + Math.floor(random() * 90);
  noise[i * 4] = value;
  noise[i * 4 + 1] = value - 12;
  noise[i * 4 + 2] = value - 30;
  noise[i * 4 + 3] = Math.floor(random() * 22);
}
await sharp(noise, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(OUT, "paper-grain.png"));
console.log("paper-grain.png");
