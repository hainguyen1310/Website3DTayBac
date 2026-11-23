// Cắt phần hộp quà từ poster Sinh Lộc làm ảnh hero trang /san-pham: phóng 2× (Lanczos) và làm nét,
// để trình duyệt không phải phóng một vùng nhỏ của poster dọc (gây mờ).
// Chạy: node scripts/build-catalog-hero.mjs
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public/assets/original/asin-sinh-loc-poster-v27.webp");
const OUTPUT = path.join(ROOT, "public/assets/original/asin-sinh-loc-box-hd.webp");

// Cùng khung với object-view-box cũ: inset(53% 18% 11% 0).
const CROP = { top: 0.53, right: 0.18, bottom: 0.11, left: 0 };
const SCALE = 2;

const { width, height } = await sharp(SOURCE).metadata();
const region = {
  left: Math.round(width * CROP.left),
  top: Math.round(height * CROP.top),
  width: Math.round(width * (1 - CROP.left - CROP.right)),
  height: Math.round(height * (1 - CROP.top - CROP.bottom)),
};

const info = await sharp(SOURCE)
  .extract(region)
  .resize(region.width * SCALE, region.height * SCALE, { kernel: "lanczos3" })
  .sharpen({ sigma: 1.1, m1: 0.9, m2: 2.4 })
  .webp({ quality: 90, effort: 6, smartSubsample: true })
  .toFile(OUTPUT);

process.stdout.write(`${path.relative(ROOT, OUTPUT)} ${info.width}×${info.height} ${Math.round(info.size / 1024)} KB\n`);
