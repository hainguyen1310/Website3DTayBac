// Ảnh nền núi đồi cho hero và các section, cắt từ poster thương hiệu A SỈN (assets-src).
// - hero-*.webp: vùng ảnh sạch (không chữ) dùng làm ảnh hero.
// - ink-range.webp: tranh thuỷ mặc núi + mặt trời + ruộng bậc thang, tách khỏi nền giấy (trong suốt).
// - sketch-range*.webp: cùng bức tranh chuyển thành nét chì (sepia / vàng nhạt), trong suốt.
// Chạy: node scripts/build-scenery.mjs  → public/media/scenery/*.webp
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = "public/media/scenery";
const SOURCE = {
  lapXuong: "assets-src/ảnh sản phẩm/lạp xưởng/cảm ơn (7).png",
  trau: "assets-src/ảnh sản phẩm/trâu/cảm ơn (12).png",
  sinhLoc: "assets-src/hộp quà 3D/RA MẮT HỘP QUÀ ĐẶC SẢN TÂY BẮC.png",
};

/** Cắt theo toạ độ tỉ lệ [x0, y0, x1, y1] của ảnh gốc. */
async function crop(file, [x0, y0, x1, y1]) {
  const { width, height } = await sharp(file).metadata();
  const left = Math.round(x0 * width);
  const top = Math.round(y0 * height);
  return sharp(file).extract({ left, top, width: Math.round(x1 * width) - left, height: Math.round(y1 * height) - top });
}

async function photo(name, file, box, maxWidth, quality = 80) {
  const output = path.join(OUT, `${name}.webp`);
  const info = await (await crop(file, box))
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(output);
  console.log(`${output}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)}KB`);
}

/**
 * Tách lớp mực khỏi giấy: độ trong suốt theo độ tối so với màu giấy (lấy ở bầu trời),
 * màu mực được "gỡ" khỏi màu giấy để đặt lên nền nào cũng tự nhiên.
 */
async function inkLayer(file, box) {
  const { data, info } = await (await crop(file, box)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  const lum = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) lum[i] = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
  const skyEnd = Math.floor(pixels * 0.25);
  const sky = Array.from(lum.subarray(0, skyEnd)).sort((a, b) => a - b);
  const paperLum = sky[Math.floor(sky.length * 0.8)];
  const paper = [0, 0, 0];
  let samples = 0;
  for (let i = 0; i < skyEnd; i++) {
    if (Math.abs(lum[i] - paperLum) >= 6) continue;
    for (let c = 0; c < 3; c++) paper[c] += data[i * 3 + c];
    samples++;
  }
  for (let c = 0; c < 3; c++) paper[c] /= samples;

  const rgba = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const alpha = Math.pow(Math.min(1, Math.max(0, (paperLum - lum[i] - 14) / 110)), 0.85);
    for (let c = 0; c < 3; c++) {
      const ink = alpha > 0.04 ? (data[i * 3 + c] - (1 - alpha) * paper[c]) / alpha : data[i * 3 + c];
      rgba[i * 4 + c] = Math.max(0, Math.min(255, Math.round(ink)));
    }
    rgba[i * 4 + 3] = Math.round(alpha * 255);
  }
  return { rgba, width: info.width, height: info.height };
}

/**
 * Nét chì: color dodge giữa ảnh xám (đã làm mịn hạt giấy) và bản đảo màu làm mờ, tô một màu duy nhất.
 * Nét quá nhạt bị bỏ để nền không lấm tấm.
 */
async function sketchLayer({ rgba, width, height }, color, gain) {
  const gray = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .flatten({ background: "#ffffff" })
    .grayscale()
    .median(3)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const inverted = Buffer.from(gray.map((value) => 255 - value));
  const blurred = await sharp(inverted, { raw: { width, height, channels: 1 } }).blur(5).extractChannel(0).raw().toBuffer();
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const dodge = Math.min(255, (gray[i] * 255) / Math.max(1, 255 - blurred[i]));
    const stroke = Math.max(0, ((255 - dodge) / 255 - 0.06) / 0.94);
    out[i * 4] = color[0];
    out[i * 4 + 1] = color[1];
    out[i * 4 + 2] = color[2];
    out[i * 4 + 3] = Math.round(Math.min(1, Math.pow(stroke, 0.9) * gain) * 255);
  }
  return out;
}

/** Làm mềm các mép ảnh để đặt ở đâu cũng không lộ cạnh vuông (tỉ lệ vùng mờ theo từng mép). */
function softEdges(buffer, width, height, { left, right, top, bottom }) {
  const out = Buffer.from(buffer);
  const ease = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(1, top ? y / (height * top) : 1, bottom ? (height - 1 - y) / (height * bottom) : 1);
    for (let x = 0; x < width; x++) {
      const fx = Math.min(1, left ? x / (width * left) : 1, right ? (width - 1 - x) / (width * right) : 1);
      const i = (y * width + x) * 4 + 3;
      out[i] = Math.round(out[i] * ease(Math.max(0, fx)) * ease(Math.max(0, fy)));
    }
  }
  return out;
}

/**
 * Dải núi không có mặt trời: xoá các điểm đỏ (mặt trời) phía trên `sunBelow`, rồi cắt từ `fromY` xuống đáy.
 * Dùng cho phía trái hero và section để không lặp hai mặt trời.
 */
function ridgeLayer({ rgba, width, height }, sunBelow, fromY) {
  const top = Math.round(height * fromY);
  const rows = height - top;
  const out = Buffer.alloc(width * rows * 4);
  rgba.copy(out, 0, top * width * 4);
  const limit = Math.round(height * sunBelow) - top;
  for (let y = 0; y < limit; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (out[i] - out[i + 1] > 40 && out[i] > 100) out[i + 3] = 0;
    }
  }
  return { rgba: out, width, height: rows };
}

/** Bản mờ hơn (nhân độ trong suốt) cho các lớp nền CSS không chỉnh được opacity riêng. */
function fade(buffer, scale) {
  const out = Buffer.from(buffer);
  for (let i = 3; i < out.length; i += 4) out[i] = Math.round(out[i] * scale);
  return out;
}

async function saveRaw(name, buffer, width, height) {
  const output = path.join(OUT, `${name}.webp`);
  const info = await sharp(buffer, { raw: { width, height, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 80, effort: 6 })
    .toFile(output);
  console.log(`${output}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)}KB`);
}

await fs.mkdir(OUT, { recursive: true });

// Ảnh hero.
await photo("hero-gift-spread", SOURCE.sinhLoc, [0, 0.33, 1, 0.905], 2000, 78);
await photo("hero-trau-poster", SOURCE.trau, [0.3, 0.36, 1, 1], 1800, 78);

// Tranh núi tách nền + nét chì, mép mềm.
const raw = await inkLayer(SOURCE.lapXuong, [0.725, 0.36, 1, 0.79]);
const edges = { left: 0.14, right: 0.06, top: 0.18, bottom: 0.03 };
const ink = { ...raw, rgba: softEdges(raw.rgba, raw.width, raw.height, edges) };
const { width, height } = ink;
const sketch = softEdges(await sketchLayer(raw, [141, 101, 58], 3.6), width, height, edges);
await saveRaw("ink-range", ink.rgba, width, height);
await saveRaw("ink-range-soft", fade(ink.rgba, 0.32), width, height);
await saveRaw("sketch-range", sketch, width, height);
await saveRaw("sketch-range-soft", fade(sketch, 0.5), width, height);
// Dải núi + ruộng bậc thang, không mặt trời.
const ridgeRaw = ridgeLayer(raw, 0.62, 0.52);
const ridgeEdges = { left: 0.12, right: 0.12, top: 0.22, bottom: 0.03 };
const ridge = softEdges(ridgeRaw.rgba, ridgeRaw.width, ridgeRaw.height, ridgeEdges);
await saveRaw("ink-ridge", ridge, ridgeRaw.width, ridgeRaw.height);
await saveRaw("sketch-ridge", softEdges(await sketchLayer(ridgeRaw, [141, 101, 58], 3.6), ridgeRaw.width, ridgeRaw.height, ridgeEdges), ridgeRaw.width, ridgeRaw.height);
// Nét vàng nhạt cho dải đỏ rượu và footer.
const light = softEdges(await sketchLayer(raw, [236, 204, 150], 3.4), width, height, edges);
await saveRaw("sketch-range-light", fade(light, 0.34), width, height);