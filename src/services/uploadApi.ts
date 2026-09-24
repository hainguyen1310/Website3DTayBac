import { supabase } from "../utils/supabase";

export const SITE_IMAGE_BUCKET = "site-images";

export const MAX_UPLOAD_MB = Number(
  import.meta.env.VITE_MAX_UPLOAD_MB ?? 10,
);

export type UploadFolder = "products" | "articles" | "settings";

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

/**
 * Tải ảnh lên Supabase Storage và trả URL công khai để lưu vào database.
 * Quyền ghi do RLS trên storage.objects quyết định (chỉ admin/staff).
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
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

  const path = buildPath(file.name, folder, file.type);
  const { error } = await supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (error) throw new Error(mapError(error.message));

  const { data } = supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
