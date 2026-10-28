// Chuyển ảnh gốc (JPG/PNG 2–22MB) sang WebP cho web, giữ tên ASCII ổn định.
// Chạy: node scripts/build-media.mjs  → public/media/**.webp
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_WIDTH = 1800;
const QUALITY = 78;
const OUT = "public/media";

/** Thư mục gốc → thư mục đích. */
const FOLDERS = {
  "assets-src/Trang chủ": "home",
  "assets-src/nguồn gốc": "origin",
  "assets-src/hộp quà 3D": "gift",
  "assets-src/ảnh sản phẩm/3 chỉ": "products/ba-chi",
  "assets-src/ảnh sản phẩm/chẩm chéo": "products/cham-cheo",
  "assets-src/ảnh sản phẩm/lạp xưởng": "products/lap-xuong",
  "assets-src/ảnh sản phẩm/lợn": "products/lon",
  "assets-src/ảnh sản phẩm/lợn xé": "products/lon-xe",
  "assets-src/ảnh sản phẩm/rượu": "products/ruou",
  "assets-src/ảnh sản phẩm/trâu": "products/trau",
  "assets-src/ảnh sản phẩm/ảnh banner": "banner",
  "assets-src/ảnh sản phẩm/ảnh xưởng đã lọc": "workshop",
  "assets-src/3Dfile/sản phẩm/hop nho": "gift/combo-small",
  "assets-src/3Dfile/sản phẩm/hop lon": "gift/combo-large",
};

const slug = (name) => name
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const [source, target] of Object.entries(FOLDERS)) {
  const files = (await fs.readdir(source)).filter((file) => /\.(jpe?g|png)$/i.test(file));
  await fs.mkdir(path.join(OUT, target), { recursive: true });
  for (const file of files) {
    const output = path.join(OUT, target, `${slug(path.parse(file).name)}.webp`);
    const info = await sharp(path.join(source, file))
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(output);
    console.log(`${output} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB`);
  }
}
