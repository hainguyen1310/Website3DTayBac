import { supabase } from "../utils/supabase";

export const SITE_IMAGE_BUCKET = "site-images";

export const MAX_UPLOAD_MB = Number(
  import.meta.env.VITE_MAX_UPLOAD_MB ?? 10,
);

export type UploadFolder = "products" | "articles" | "settings";
export type UploadRendition = "full" | "social";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const FULL_MAX_EDGE = 1920;
const SOCIAL_WIDTH = 1200;
const SOCIAL_HEIGHT = 630;

function buildPath(filename: string, folder: UploadFolder, contentType: string) {
  const extension =
    EXTENSIONS[contentType] ??
    (/\.([a-z0-9]+)$/i.exec(filename)?.[1] ?? "jpg").toLowerCase();
  const base = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const unique = crypto.randomUUID().slice(0, 8);
  return `${folder}/${stamp}/${Date.now()}-${base || "anh"}-${unique}.${extension}`;
}

function mapError(message: string) {
  if (message.includes("Bucket not found")) {
    return "Chưa có bucket site-images. Chạy migration 20260922000000_site_images_storage.sql trong Supabase.";
  }
  if (message.includes("row-level security") || message.includes("Unauthorized")) {
    return "Tài khoản không có quyền tải ảnh lên.";
  }
  if (message.includes("maximum allowed size")) {
    return `Ảnh vượt quá ${MAX_UPLOAD_MB}MB.`;
  }
  if (message.includes("mime type")) {
    return "Bucket không nhận định dạng ảnh này.";
  }
  return message;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh."));
    image.src = URL.createObjectURL(file);
  });
}

function drawToCanvas(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Không nén được ảnh."))),
      "image/webp",
      0.85,
    );
  });
}

/**
 * Tối ưu ảnh trước khi upload (B12):
 * - full: giữ tối đa 1920px cạnh dài, nén WebP;
 * - social: crop trung tâm 1200×630 cho ảnh chia sẻ.
 * GIF được giữ nguyên để không mất animation.
 */
export async function optimizeImage(file: File, rendition: UploadRendition): Promise<{ blob: Blob; type: string; name: string }> {
  if (file.type === "image/gif") return { blob: file, type: file.type, name: file.name };
  try {
    const source = await loadBitmap(file);
    const sourceWidth = "width" in source ? source.width : 0;
    const sourceHeight = "height" in source ? source.height : 0;
    if (!sourceWidth || !sourceHeight) return { blob: file, type: file.type, name: file.name };

    let canvas: HTMLCanvasElement;
    if (rendition === "social") {
      const targetRatio = SOCIAL_WIDTH / SOCIAL_HEIGHT;
      const sourceRatio = sourceWidth / sourceHeight;
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      if (sourceRatio > targetRatio) cropWidth = Math.round(sourceHeight * targetRatio);
      else cropHeight = Math.round(sourceWidth / targetRatio);
      canvas = drawToCanvas(
        source,
        SOCIAL_WIDTH,
        SOCIAL_HEIGHT,
        Math.round((sourceWidth - cropWidth) / 2),
        Math.round((sourceHeight - cropHeight) / 2),
        cropWidth,
        cropHeight,
      );
    } else {
      const scale = Math.min(1, FULL_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      canvas = drawToCanvas(source, width, height, 0, 0, sourceWidth, sourceHeight);
    }
    const blob = await canvasToBlob(canvas);
    if (blob.size >= file.size && rendition === "full") return { blob: file, type: file.type, name: file.name };
    return { blob, type: "image/webp", name: file.name.replace(/\.[^.]+$/, ".webp") };
  } catch {
    return { blob: file, type: file.type, name: file.name };
  }
}

/**
 * Tải ảnh lên Supabase Storage và trả URL công khai để lưu vào database.
 * Quyền ghi do RLS trên storage.objects quyết định (chỉ admin/staff).
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
  rendition: UploadRendition = "full",
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Chỉ nhận ảnh JPG, PNG, WebP, AVIF hoặc GIF.");
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Ảnh vượt quá ${MAX_UPLOAD_MB}MB.`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Phiên đăng nhập đã hết hạn. Đăng nhập lại giúp A Sỉn.");
  }

  const optimized = await optimizeImage(file, rendition);
  const path = buildPath(optimized.name, folder, optimized.type);
  const { error } = await supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .upload(path, optimized.blob, {
      cacheControl: "31536000",
      contentType: optimized.type,
      upsert: false,
    });
  if (error) throw new Error(mapError(error.message));

  const { data } = supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
