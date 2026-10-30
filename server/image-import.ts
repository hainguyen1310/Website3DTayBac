import { db, json } from "./email/shared.ts";

/**
 * Tải lại ảnh nằm trên máy chủ Google (ảnh dán từ Google Docs) để trình soạn
 * bài viết đưa vào kho ảnh của A Sỉn. Trình duyệt thường không tự tải được do
 * CORS. Chỉ nhân viên đã đăng nhập dùng được và chỉ chấp nhận host của Google,
 * nên endpoint không thể bị dùng để gọi địa chỉ nội bộ (SSRF).
 */

const ALLOWED_HOST_SUFFIXES = [".googleusercontent.com", ".ggpht.com"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

async function contentStaff(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
  const client = db();
  const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (error || !data.user) return null;
  const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).single();
  // Marketing cũng soạn bài nên mọi nhân viên (admin/staff) đều được dùng.
  return profile && (profile.role === "admin" || profile.role === "staff") ? profile : null;
}

export async function imageImport(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await contentStaff(req))) return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);
  let url = "";
  try {
    const input = await req.json();
    url = typeof input?.url === "string" ? input.url.trim() : "";
  } catch {
    return json({ error: "Yêu cầu không hợp lệ." }, 400);
  }
  if (!isAllowedImageUrl(url)) return json({ error: "Chỉ nhập được ảnh từ Google Docs." }, 400);

  let upstream: Response;
  try {
    upstream = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return json({ error: "Không tải được ảnh từ Google. Ảnh có thể đã hết hạn chia sẻ." }, 502);
  }
  // Chuyển hướng cũng phải nằm trong danh sách host cho phép.
  if (!upstream.ok || !isAllowedImageUrl(upstream.url || url))
    return json({ error: "Google không trả về ảnh này." }, 502);
  const type = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) return json({ error: "Định dạng ảnh không được hỗ trợ." }, 415);
  const declared = Number(upstream.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return json({ error: "Ảnh lớn hơn 10MB." }, 413);
  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return json({ error: "Ảnh lớn hơn 10MB." }, 413);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
